import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";
import { Cart } from "../models/Cart.js";
import { User } from "../models/User.js";

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token !== "valid-token") {
      const error = new Error("Invalid token");
      error.statusCode = 401;
      throw error;
    }

    return { uid: "test-firebase-uid", email: "cart-tester@example.com", auth_time: Math.floor(Date.now() / 1000) };
  }),
  isFirebaseAdminConfigured: () => true,
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("cart-test"));
});

afterEach(async () => {
  await Product.deleteMany({});
  await Cart.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const authHeader = { Authorization: "Bearer valid-token" };

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

describe("Cart API", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.statusCode).toBe(401);
  });

  it("returns an empty cart for a new user", async () => {
    const res = await request(app).get("/api/cart").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.pricing.total).toBe(0);
  });

  it("adds an item and computes pricing", async () => {
    await seedProduct({ id: "cards-1", price: 100, mrp: 120, stock: 10 });

    const res = await request(app)
      .post("/api/cart/items")
      .set(authHeader)
      .send({ productId: "cards-1", quantity: 2 });

    expect(res.statusCode).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.pricing.subtotal).toBe(200);
  });

  it("rejects adding more than available stock", async () => {
    await seedProduct({ id: "low-stock", stock: 1 });

    const res = await request(app)
      .post("/api/cart/items")
      .set(authHeader)
      .send({ productId: "low-stock", quantity: 5 });

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("OUT_OF_STOCK");
  });

  it("updates item quantity", async () => {
    await seedProduct({ id: "cards-2", stock: 10 });
    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "cards-2", quantity: 1 });

    const res = await request(app).patch("/api/cart/items/cards-2").set(authHeader).send({ quantity: 3 });

    expect(res.statusCode).toBe(200);
    expect(res.body.items[0].quantity).toBe(3);
  });

  it("removes an item", async () => {
    await seedProduct({ id: "cards-3", stock: 10 });
    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "cards-3", quantity: 1 });

    const res = await request(app).delete("/api/cart/items/cards-3").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it("flags out-of-stock and price-changed items on read, and excludes them from pricing", async () => {
    await seedProduct({ id: "cards-4", price: 100, stock: 5 });
    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "cards-4", quantity: 2 });

    await Product.findOneAndUpdate({ id: "cards-4" }, { price: 150, stock: 0 });

    const res = await request(app).get("/api/cart").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.items[0].isOutOfStock).toBe(true);
    expect(res.body.items[0].isPriceChanged).toBe(true);
    expect(res.body.pricing.total).toBe(0);
  });

  it("merges guest items, summing quantities and clamping to stock", async () => {
    await seedProduct({ id: "merge-1", stock: 3 });
    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "merge-1", quantity: 1 });

    const res = await request(app)
      .post("/api/cart/merge")
      .set(authHeader)
      .send({ items: [{ productId: "merge-1", quantity: 5 }] });

    expect(res.statusCode).toBe(200);
    expect(res.body.items[0].quantity).toBe(3);
    expect(res.body.clamped).toEqual([{ productId: "merge-1", requestedQuantity: 6, finalQuantity: 3 }]);
  });

  it("toggles save for later and excludes it from pricing", async () => {
    await seedProduct({ id: "save-1", price: 50, stock: 10 });
    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "save-1", quantity: 2 });

    const res = await request(app)
      .patch("/api/cart/items/save-1/save-for-later")
      .set(authHeader)
      .send({ savedForLater: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.items[0].savedForLater).toBe(true);
    expect(res.body.pricing.subtotal).toBe(0);
  });

  it("clears the cart", async () => {
    await seedProduct({ id: "clear-1", stock: 10 });
    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "clear-1", quantity: 1 });

    const res = await request(app).delete("/api/cart").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});
