import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { appConfig } from "../config.js";
import { Product } from "../models/Product.js";
import { Counter } from "../models/Counter.js";
import { User } from "../models/User.js";
import { ensureProductCodes, formatProductCode } from "../services/productCodes.js";

let mongoServer;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("product-codes-test"));
  await Product.init();
  const admin = await User.create({ id: "codes-admin", name: "Admin", email: "codes@ee.com", role: "admin" });
  adminToken = jwt.sign({ sub: admin.id }, appConfig.jwtSecret);
});

afterEach(async () => {
  await Product.deleteMany({});
  await Counter.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

const asAdmin = (req) => req.set("Authorization", `Bearer ${adminToken}`);
let seq = 0;
const create = (overrides = {}) => {
  seq += 1;
  return asAdmin(request(app).post("/api/admin/products")).send({
    name: `Card ${seq}`,
    description: "A card.",
    category: "Wedding Cards",
    images: ["https://example.com/c.jpg"],
    price: 30,
    mrp: 40,
    stock: 500,
    status: "active",
    ...overrides,
  });
};

describe("product numbers", () => {
  it("formats numbers with at least four digits", () => {
    expect(formatProductCode(1)).toBe("EI-0001");
    expect(formatProductCode(16)).toBe("EI-0016");
    expect(formatProductCode(12345)).toBe("EI-12345");
  });

  it("gives each new product the next number, never the same twice, even when created at once", async () => {
    const first = await create();
    expect(first.status).toBe(201);
    expect(first.body.product.code).toBe("EI-0001");

    const many = await Promise.all([create(), create(), create(), create(), create()]);
    const codes = many.map((res) => res.body.product.code);
    expect(new Set(codes).size).toBe(5);
    expect(codes.sort()).toEqual(["EI-0002", "EI-0003", "EI-0004", "EI-0005", "EI-0006"]);
  });

  it("never changes a product's number, and never reuses a deleted one", async () => {
    const { body } = await create();
    const id = body.product.id;
    const update = await asAdmin(request(app).put(`/api/admin/products/${id}`)).send({ code: "EI-9999", stock: 7 });
    expect(update.status).toBe(200);
    expect(update.body.product.code).toBe("EI-0001");

    await asAdmin(request(app).delete(`/api/admin/products/${id}`));
    const next = await create();
    expect(next.body.product.code).toBe("EI-0002");
  });

  it("finds a product by its number", async () => {
    await create({ name: "Royal Red" });
    await create({ name: "Floral Bloom" });
    const found = await request(app).get("/api/products?q=ei-0002");
    expect(found.body.items.map((item) => item.name)).toEqual(["Floral Bloom"]);
  });

  it("numbers existing products oldest first, after any numbers already given out, and only once", async () => {
    await Product.collection.insertMany([
      { id: "old-b", name: "B", description: "d", category: "c", images: ["x"], price: 1, mrp: 1, stock: 1, createdAt: new Date("2026-02-01") },
      { id: "old-a", name: "A", description: "d", category: "c", images: ["x"], price: 1, mrp: 1, stock: 1, createdAt: new Date("2026-01-01") },
      { id: "has-code", name: "C", description: "d", category: "c", images: ["x"], price: 1, mrp: 1, stock: 1, code: "EI-0007", createdAt: new Date("2025-12-01") },
    ]);

    expect(await ensureProductCodes()).toMatchObject({ numbered: 2 });
    const byId = Object.fromEntries((await Product.find().lean()).map((row) => [row.id, row.code]));
    expect(byId).toEqual({ "old-a": "EI-0008", "old-b": "EI-0009", "has-code": "EI-0007" });

    expect(await ensureProductCodes()).toMatchObject({ numbered: 0 });
    const next = await create();
    expect(next.body.product.code).toBe("EI-0010");
  });
});
