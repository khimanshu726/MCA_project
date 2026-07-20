import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("recommendations-test"));
});

afterEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
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
    mrp: 100,
    stock: 10,
    status: "active",
    ...overrides,
  });
};

let orderCounter = 0;

const seedOrder = (lineItemProductIds) => {
  orderCounter += 1;

  return Order.create({
    id: `order-${orderCounter}`,
    orderId: `EE-TEST-${orderCounter}`,
    customerName: "Test Buyer",
    phone: "9876543210",
    address: { street: "1 Test St", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
    quantity: lineItemProductIds.length,
    price: 100 * lineItemProductIds.length,
    paymentMethod: "cod",
    lineItems: lineItemProductIds.map((productId) => ({
      productId,
      name: productId,
      quantity: 1,
      unitPrice: 100,
      totalPrice: 100,
    })),
  });
};

describe("GET /api/products/:id/frequently-bought-together", () => {
  it("ranks products by real order co-occurrence", async () => {
    await seedProduct({ id: "cards-1", category: "Visiting Cards" });
    await seedProduct({ id: "cards-2", category: "Visiting Cards" });
    await seedProduct({ id: "cards-3", category: "Visiting Cards" });

    // cards-2 co-occurs with cards-1 twice, cards-3 only once.
    await seedOrder(["cards-1", "cards-2"]);
    await seedOrder(["cards-1", "cards-2"]);
    await seedOrder(["cards-1", "cards-3"]);

    const res = await request(app).get("/api/products/cards-1/frequently-bought-together");

    expect(res.statusCode).toBe(200);
    expect(res.body.items[0].id).toBe("cards-2");
    expect(res.body.items[1].id).toBe("cards-3");
  });

  it("falls back to same-category products when there is little or no order history", async () => {
    await seedProduct({ id: "lonely-product", category: "Banners" });
    await seedProduct({ id: "banner-2", category: "Banners" });
    await seedProduct({ id: "banner-3", category: "Banners" });
    await seedProduct({ id: "unrelated", category: "Photo Gifts" });

    const res = await request(app).get("/api/products/lonely-product/frequently-bought-together");

    expect(res.statusCode).toBe(200);
    const ids = res.body.items.map((item) => item.id);
    expect(ids).toContain("banner-2");
    expect(ids).toContain("banner-3");
    expect(ids).not.toContain("unrelated");
    expect(ids).not.toContain("lonely-product");
  });

  it("returns an empty list for a product that does not exist", async () => {
    const res = await request(app).get("/api/products/does-not-exist/frequently-bought-together");

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("excludes inactive co-occurring products and pads with category fallback", async () => {
    await seedProduct({ id: "main-item", category: "Stationery" });
    await seedProduct({ id: "draft-item", category: "Stationery", status: "draft" });
    await seedProduct({ id: "stationery-fallback", category: "Stationery" });

    await seedOrder(["main-item", "draft-item"]);

    const res = await request(app).get("/api/products/main-item/frequently-bought-together");
    const ids = res.body.items.map((item) => item.id);

    expect(ids).not.toContain("draft-item");
    expect(ids).toContain("stationery-fallback");
  });
});
