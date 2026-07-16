import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { appConfig } from "../config.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

/**
 * The admin product API existed but had never been exercised, and until now
 * `updateAdminProduct` forwarded the raw body straight into `$set` — no
 * validation, no field whitelist. These tests pin the CRUD behaviour and the
 * two guarantees that make a product-management UI safe to expose: an update
 * can't blank a required field or corrupt an unbuyable/identity value, and it
 * can't rewrite id/slug/source.
 */
let mongoServer;
let adminToken;
let userToken;

const validProduct = (overrides = {}) => ({
  name: "Matte Business Cards",
  description: "350gsm premium matte finish cards.",
  category: "Visiting Cards",
  images: ["https://example.com/card.jpg"],
  price: 40,
  mrp: 50,
  stock: 500,
  minimumOrderQty: 100,
  status: "active",
  ...overrides,
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("admin-products-test"));

  const admin = await User.create({ id: "admin-1", name: "Admin", email: "admin@ee.com", role: "admin" });
  const user = await User.create({ id: "user-1", name: "User", email: "user@ee.com", role: "user" });
  adminToken = jwt.sign({ sub: admin.id }, appConfig.jwtSecret);
  userToken = jwt.sign({ sub: user.id }, appConfig.jwtSecret);
});

afterEach(async () => {
  await Product.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

const asAdmin = (req) => req.set("Authorization", `Bearer ${adminToken}`);

describe("POST /api/admin/products", () => {
  it("creates a product and defaults its source to admin", async () => {
    const res = await asAdmin(request(app).post("/api/admin/products")).send(validProduct());

    expect(res.statusCode).toBe(201);
    expect(res.body.product).toMatchObject({ name: "Matte Business Cards", stock: 500, source: "admin" });
    expect(res.body.product.id).toBeTruthy();
    expect(res.body.product.slug).toBe("matte-business-cards");
  });

  it("rejects a create missing required fields", async () => {
    const res = await asAdmin(request(app).post("/api/admin/products")).send({ price: 10 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toHaveProperty("name");
    expect(res.body.errors).toHaveProperty("images");
  });

  it("rejects a price greater than mrp", async () => {
    const res = await asAdmin(request(app).post("/api/admin/products")).send(validProduct({ price: 80, mrp: 50 }));

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toHaveProperty("mrp");
  });

  it("blocks non-admins", async () => {
    const res = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${userToken}`)
      .send(validProduct());

    expect(res.statusCode).toBe(403);
  });

  it("blocks unauthenticated requests", async () => {
    const res = await request(app).post("/api/admin/products").send(validProduct());
    expect(res.statusCode).toBe(401);
  });
});

describe("PUT /api/admin/products/:id", () => {
  const seed = () => asAdmin(request(app).post("/api/admin/products")).send(validProduct());

  it("updates only the fields sent (stock alone is fine)", async () => {
    const { body } = await seed();

    const res = await asAdmin(request(app).put(`/api/admin/products/${body.product.id}`)).send({ stock: 2500 });

    expect(res.statusCode).toBe(200);
    expect(res.body.product.stock).toBe(2500);
    expect(res.body.product.name).toBe("Matte Business Cards");
  });

  it("refuses to blank a required field", async () => {
    const { body } = await seed();

    const res = await asAdmin(request(app).put(`/api/admin/products/${body.product.id}`)).send({ name: "  " });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toHaveProperty("name");
  });

  it("ignores attempts to rewrite id, slug, and source", async () => {
    const { body } = await seed();
    const original = body.product;

    const res = await asAdmin(request(app).put(`/api/admin/products/${original.id}`)).send({
      id: "hacked-id",
      slug: "hacked-slug",
      source: "data-js-seed",
      badge: "Sale",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.product.id).toBe(original.id);
    expect(res.body.product.source).toBe("admin");
    expect(res.body.product.badge).toBe("Sale");
    // slug is derived from name, which didn't change.
    expect(res.body.product.slug).toBe(original.slug);
  });

  it("rejects a stock update that isn't a non-negative integer", async () => {
    const { body } = await seed();

    const res = await asAdmin(request(app).put(`/api/admin/products/${body.product.id}`)).send({ stock: -5 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toHaveProperty("stock");
  });

  it("rejects a price/mrp inversion introduced by a single-field edit", async () => {
    const { body } = await seed(); // price 40, mrp 50

    const res = await asAdmin(request(app).put(`/api/admin/products/${body.product.id}`)).send({ price: 90 });

    expect(res.statusCode).toBe(400);
  });

  it("404s for an unknown product", async () => {
    const res = await asAdmin(request(app).put("/api/admin/products/nope")).send({ stock: 1 });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/admin/products", () => {
  it("returns inactive products too, unlike the storefront listing", async () => {
    await asAdmin(request(app).post("/api/admin/products")).send(validProduct({ name: "Draft One", status: "draft" }));

    const res = await asAdmin(request(app).get("/api/admin/products"));

    expect(res.statusCode).toBe(200);
    expect(res.body.items.some((p) => p.status === "draft")).toBe(true);
  });
});

describe("DELETE /api/admin/products/:id", () => {
  it("removes a product", async () => {
    const { body } = await asAdmin(request(app).post("/api/admin/products")).send(validProduct());

    const del = await asAdmin(request(app).delete(`/api/admin/products/${body.product.id}`));
    expect(del.statusCode).toBe(200);

    expect(await Product.findOne({ id: body.product.id })).toBeNull();
  });
});
