import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("products-test"));
});

afterEach(async () => {
  await Product.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const seedProduct = (overrides = {}) => {
  const id = overrides.id || `product-${Math.random().toString(36).slice(2)}`;

  return Product.create({
    id,
    name: `Test Product ${id}`,
    description: "A test product",
    category: "Visiting Cards",
    images: ["https://example.com/image.jpg"],
    price: 100,
    mrp: 120,
    stock: 10,
    status: "active",
    ...overrides,
  });
};

describe("Product API", () => {
  it("lists only active products publicly", async () => {
    await seedProduct({ id: "active-1", status: "active" });
    await seedProduct({ id: "draft-1", status: "draft" });

    const res = await request(app).get("/api/products");

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe("active-1");
  });

  it("filters by category", async () => {
    await seedProduct({ id: "cards-1", category: "Visiting Cards" });
    await seedProduct({ id: "flyers-1", category: "Marketing Materials" });

    const res = await request(app).get("/api/products").query({ category: "Marketing Materials" });

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe("flyers-1");
  });

  it("returns a single active product with a computed discount percent", async () => {
    await seedProduct({ id: "discounted", price: 80, mrp: 100 });

    const res = await request(app).get("/api/products/discounted");

    expect(res.statusCode).toBe(200);
    expect(res.body.product.discountPercent).toBe(20);
  });

  it("returns 404 for a draft product on the public detail route", async () => {
    await seedProduct({ id: "draft-detail", status: "draft" });

    const res = await request(app).get("/api/products/draft-detail");

    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for a product that does not exist", async () => {
    const res = await request(app).get("/api/products/does-not-exist");

    expect(res.statusCode).toBe(404);
  });

  it("blocks unauthenticated access to admin product creation", async () => {
    const res = await request(app).post("/api/admin/products").send({
      name: "Admin Product",
      description: "desc",
      category: "Banners",
      images: ["https://example.com/img.jpg"],
      price: 50,
    });

    expect(res.statusCode).toBe(401);
  });

  it("blocks unauthenticated access to the admin product listing", async () => {
    const res = await request(app).get("/api/admin/products");

    expect(res.statusCode).toBe(401);
  });
});
