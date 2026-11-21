import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { appConfig } from "../config.js";
import { HsnCode } from "../models/HsnCode.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { ensureHsnCodesSeeded, SUGGESTED_HSN_CODES } from "../services/hsnSeed.js";
import { getSellerGstin } from "../config/gst.js";

let mongoServer;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("hsn-codes-test"));
  await HsnCode.init();
  const admin = await User.create({ id: "hsn-admin", name: "Admin", email: "hsn-admin@ee.com", role: "admin" });
  adminToken = jwt.sign({ sub: admin.id }, appConfig.jwtSecret);
});

beforeEach(async () => {
  await ensureHsnCodesSeeded();
});

afterEach(async () => {
  await HsnCode.deleteMany({});
  await Product.deleteMany({});
  delete process.env.SELLER_GSTIN;
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

const asAdmin = (req) => req.set("Authorization", `Bearer ${adminToken}`);
const rowByCode = async (code) => HsnCode.findOne({ code });

const seedProduct = (overrides = {}) =>
  Product.create({
    id: "hsn-card",
    name: "HSN Card",
    description: "d",
    category: "Visiting Cards",
    images: ["https://example.com/i.jpg"],
    price: 18,
    mrp: 18,
    stock: 1000,
    minimumOrderQty: 100,
    status: "active",
    ...overrides,
  });

describe("suggested HSN codes", () => {
  it("seeds every suggestion as unconfirmed", async () => {
    const rows = await HsnCode.find();
    expect(rows).toHaveLength(SUGGESTED_HSN_CODES.length);
    expect(rows.every((row) => row.confirmed === false)).toBe(true);
  });

  it("never overwrites codes the owner has edited", async () => {
    await HsnCode.updateOne({ code: "4909" }, { rate: 5, confirmed: true });
    await ensureHsnCodesSeeded();
    const row = await rowByCode("4909");
    expect(row.rate).toBe(5);
    expect(row.confirmed).toBe(true);
  });

  it("has one row each for the shipping fee and the platform fee", async () => {
    expect(await HsnCode.countDocuments({ appliesTo: "shipping" })).toBe(1);
    expect(await HsnCode.countDocuments({ appliesTo: "platformFee" })).toBe(1);
  });
});

describe("admin HSN API", () => {
  it("requires an admin", async () => {
    expect((await request(app).get("/api/admin/hsn-codes")).statusCode).toBe(401);
  });

  it("lists codes with how many products use each", async () => {
    await seedProduct({ hsnCode: "998912" });
    const res = await asAdmin(request(app).get("/api/admin/hsn-codes")).expect(200);
    expect(res.body.hsnCodes.find((row) => row.code === "998912").productCount).toBe(1);
  });

  it("confirms a code, and un-confirms it when the rate later changes", async () => {
    const { _id } = await rowByCode("4909");

    const confirmed = await asAdmin(request(app).put(`/api/admin/hsn-codes/${_id}`)).send({ rate: 5, confirmed: true }).expect(200);
    expect(confirmed.body.hsnCode).toMatchObject({ rate: 5, confirmed: true });

    const notesOnly = await asAdmin(request(app).put(`/api/admin/hsn-codes/${_id}`)).send({ notes: "Checked with CA" }).expect(200);
    expect(notesOnly.body.hsnCode.confirmed).toBe(true);

    const rateChanged = await asAdmin(request(app).put(`/api/admin/hsn-codes/${_id}`)).send({ rate: 18 }).expect(200);
    expect(rateChanged.body.hsnCode.confirmed).toBe(false);
  });

  it("rejects a rate that isn't a GST slab, and a half-set value threshold", async () => {
    const { _id } = await rowByCode("4909");
    const badRate = await asAdmin(request(app).put(`/api/admin/hsn-codes/${_id}`)).send({ rate: 7 });
    expect(badRate.statusCode).toBe(400);
    expect(badRate.body.errors.rate).toMatch(/must be one of/);

    const halfThreshold = await asAdmin(request(app).put(`/api/admin/hsn-codes/${_id}`)).send({ priceThreshold: 1000 });
    expect(halfThreshold.statusCode).toBe(400);
    expect(halfThreshold.body.errors.priceThreshold).toMatch(/both/);
  });

  it("allows only one row to cover the shipping fee", async () => {
    const res = await asAdmin(request(app).post("/api/admin/hsn-codes")).send({
      code: "996813",
      kind: "SAC",
      description: "Another delivery code",
      rate: 18,
      appliesTo: "shipping",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.errors.appliesTo).toMatch(/996812 already covers the shipping fee/);
  });

  it("rejects a duplicate code", async () => {
    const res = await asAdmin(request(app).post("/api/admin/hsn-codes")).send({ code: "4909", description: "dup", rate: 18 });
    expect(res.statusCode).toBe(400);
    expect(res.body.errors.code).toMatch(/already exists/);
  });

  it("won't delete or renumber a code that products use", async () => {
    await seedProduct({ hsnCode: "998912" });
    const { _id } = await rowByCode("998912");

    expect((await asAdmin(request(app).delete(`/api/admin/hsn-codes/${_id}`))).statusCode).toBe(409);
    expect((await asAdmin(request(app).put(`/api/admin/hsn-codes/${_id}`)).send({ code: "998913" })).statusCode).toBe(409);
    expect(await rowByCode("998912")).not.toBeNull();
  });

  it("deletes an unused code", async () => {
    const { _id } = await rowByCode("6912");
    await asAdmin(request(app).delete(`/api/admin/hsn-codes/${_id}`)).expect(200);
    expect(await rowByCode("6912")).toBeNull();
  });
});

describe("product HSN code", () => {
  it("can be set from the admin product API, and must be a code in the table", async () => {
    await seedProduct();

    const ok = await asAdmin(request(app).put("/api/admin/products/hsn-card")).send({ hsnCode: "998912" }).expect(200);
    expect(ok.body.product.hsnCode).toBe("998912");

    const unknown = await asAdmin(request(app).put("/api/admin/products/hsn-card")).send({ hsnCode: "12345678" });
    expect(unknown.statusCode).toBe(400);
    expect(unknown.body.errors.hsnCode).toMatch(/Pick an HSN code/);
  });
});

describe("GST readiness", () => {
  it("reads the seller GSTIN and refuses an invalid one", () => {
    process.env.SELLER_GSTIN = "10ADTPM9552H1Z8";
    expect(getSellerGstin()).toMatchObject({ configured: true, gstin: "10ADTPM9552H1Z8", stateCode: "10" });

    process.env.SELLER_GSTIN = "10ADTPM9552HIZ8";
    expect(getSellerGstin()).toMatchObject({ configured: false, gstin: null });
  });

  it("reports GST status on /api/health without charging GST", async () => {
    process.env.SELLER_GSTIN = "10ADTPM9552H1Z8";
    await seedProduct({ id: "no-hsn" });
    await seedProduct({ id: "unconfirmed", name: "Unconfirmed", hsnCode: "4909" });

    const res = await request(app).get("/api/health").expect(200);

    expect(res.body.gst).toEqual({
      sellerGstinConfigured: true,
      sellerGstinError: null,
      chargingEnabled: false,
      productsMissingHsn: 1,
      unconfirmedHsnInUse: 1,
    });
  });
});
