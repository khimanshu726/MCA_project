import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";
import { Wishlist } from "../models/Wishlist.js";
import { User } from "../models/User.js";

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token !== "valid-token") {
      const error = new Error("Invalid token");
      error.statusCode = 401;
      throw error;
    }

    return { uid: "test-firebase-uid", email: "wishlist-tester@example.com", auth_time: Math.floor(Date.now() / 1000) };
  }),
  isFirebaseAdminConfigured: () => true,
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("wishlist-test"));
});

afterEach(async () => {
  await Product.deleteMany({});
  await Wishlist.deleteMany({});
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

describe("Wishlist API", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/wishlist");
    expect(res.statusCode).toBe(401);
  });

  it("returns an empty wishlist for a new user", async () => {
    const res = await request(app).get("/api/wishlist").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("adds an item to the wishlist", async () => {
    await seedProduct({ id: "cards-1" });

    const res = await request(app).post("/api/wishlist/items").set(authHeader).send({ productId: "cards-1" });

    expect(res.statusCode).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productId).toBe("cards-1");
    expect(res.body.items[0].product.name).toBe("Test Product cards-1");
  });

  it("does not duplicate an item that is already in the wishlist", async () => {
    await seedProduct({ id: "cards-2" });

    await request(app).post("/api/wishlist/items").set(authHeader).send({ productId: "cards-2" });
    const res = await request(app).post("/api/wishlist/items").set(authHeader).send({ productId: "cards-2" });

    expect(res.body.items).toHaveLength(1);
  });

  it("rejects adding a product that does not exist", async () => {
    const res = await request(app).post("/api/wishlist/items").set(authHeader).send({ productId: "nope" });

    expect(res.statusCode).toBe(404);
  });

  it("removes an item", async () => {
    await seedProduct({ id: "cards-3" });
    await request(app).post("/api/wishlist/items").set(authHeader).send({ productId: "cards-3" });

    const res = await request(app).delete("/api/wishlist/items/cards-3").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it("flags an out-of-stock item without excluding it", async () => {
    await seedProduct({ id: "cards-4", stock: 0 });
    await request(app).post("/api/wishlist/items").set(authHeader).send({ productId: "cards-4" });

    const res = await request(app).get("/api/wishlist").set(authHeader);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].isOutOfStock).toBe(true);
  });

  it("clears the wishlist", async () => {
    await seedProduct({ id: "cards-5" });
    await request(app).post("/api/wishlist/items").set(authHeader).send({ productId: "cards-5" });

    const res = await request(app).delete("/api/wishlist").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});
