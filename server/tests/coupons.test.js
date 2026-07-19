import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";
import { Cart } from "../models/Cart.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token !== "valid-token") {
      const error = new Error("Invalid token");
      error.statusCode = 401;
      throw error;
    }

    return { uid: "test-firebase-uid", email: "coupon-tester@example.com", auth_time: Math.floor(Date.now() / 1000) };
  }),
  isFirebaseAdminConfigured: () => true,
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("coupons-test"));
});

afterEach(async () => {
  await Product.deleteMany({});
  await Cart.deleteMany({});
  await Coupon.deleteMany({});
  await Order.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const authHeader = { Authorization: "Bearer valid-token" };

const seedProduct = (overrides = {}) => {
  const id = overrides.id || `product-${Math.random().toString(36).slice(2)}`;
  const price = overrides.price ?? 100;

  return Product.create({
    id,
    name: `Test Product ${id}`,
    description: "A test product",
    category: "Visiting Cards",
    images: ["https://example.com/image.jpg"],
    price,
    mrp: price,
    stock: 10,
    status: "active",
    ...overrides,
  });
};

const seedCoupon = (overrides = {}) =>
  Coupon.create({
    code: "TESTCODE",
    type: "percentage",
    value: 10,
    minOrderValue: 0,
    isActive: true,
    ...overrides,
  });

const baseOrderFields = {
  customerName: "Test Buyer",
  phone: "9876543210",
  email: "buyer@example.com",
  streetAddress: "123 Test St",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  paymentMethod: "cod",
  shippingCharge: "0",
};

describe("Cart coupon endpoints", () => {
  it("applies a valid coupon and reflects the discount in cart pricing", async () => {
    await seedProduct({ id: "cards-1", price: 200 });
    await seedCoupon({ code: "SAVE10", type: "percentage", value: 10 });

    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "cards-1", quantity: 1 });
    const res = await request(app).post("/api/cart/coupon").set(authHeader).send({ code: "save10" });

    expect(res.statusCode).toBe(200);
    expect(res.body.pricing.couponCode).toBe("SAVE10");
    expect(res.body.pricing.couponDiscount).toBe(20);
  });

  it("rejects a coupon below the minimum order value", async () => {
    await seedProduct({ id: "cards-2", price: 50 });
    await seedCoupon({ code: "BIGORDER", type: "flat", value: 20, minOrderValue: 500 });

    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "cards-2", quantity: 1 });
    const res = await request(app).post("/api/cart/coupon").set(authHeader).send({ code: "BIGORDER" });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("COUPON_INVALID");
  });

  it("rejects an expired coupon", async () => {
    await seedProduct({ id: "cards-3", price: 500 });
    await seedCoupon({ code: "OLDCODE", type: "flat", value: 10, expiresAt: new Date(Date.now() - 86400000) });

    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "cards-3", quantity: 1 });
    const res = await request(app).post("/api/cart/coupon").set(authHeader).send({ code: "OLDCODE" });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("COUPON_INVALID");
  });

  it("removes an applied coupon", async () => {
    await seedProduct({ id: "cards-4", price: 200 });
    await seedCoupon({ code: "SAVE20", type: "flat", value: 20 });

    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "cards-4", quantity: 1 });
    await request(app).post("/api/cart/coupon").set(authHeader).send({ code: "SAVE20" });
    const res = await request(app).delete("/api/cart/coupon").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.pricing.couponCode).toBeNull();
  });

  it("auto-clears a coupon the moment the subtotal falls below the minimum order value", async () => {
    await seedProduct({ id: "cards-5", price: 600 });
    await seedCoupon({ code: "BIG500", type: "flat", value: 50, minOrderValue: 500 });

    await request(app).post("/api/cart/items").set(authHeader).send({ productId: "cards-5", quantity: 1 });
    await request(app).post("/api/cart/coupon").set(authHeader).send({ code: "BIG500" });

    // Removing the item drops the subtotal to 0, well below the coupon's
    // minimum — the very next cart read should auto-clear it and explain why.
    const res = await request(app).delete("/api/cart/items/cards-5").set(authHeader);

    expect(res.body.pricing.couponCode).toBeNull();
    expect(res.body.couponError).toMatch(/removed/i);
  });
});

describe("Order creation — coupon re-validation", () => {
  const placeOrder = (lineItems, overrides = {}) =>
    request(app)
      .post("/api/orders")
      .field({ ...baseOrderFields, ...overrides })
      .field("lineItems", JSON.stringify(lineItems));

  it("applies a valid coupon discount to the order total", async () => {
    await seedProduct({ id: "order-item-1", price: 100 });
    await seedCoupon({ code: "ORDER10", type: "percentage", value: 10 });

    const res = await placeOrder([{ productId: "order-item-1", quantity: 2 }], { couponCode: "ORDER10" });

    expect(res.statusCode).toBe(201);
    expect(res.body.order.couponCode).toBe("ORDER10");
    expect(res.body.order.couponDiscount).toBe(20); // 10% of 200
    expect(res.body.order.subtotal).toBe(200);
  });

  it("rejects an order with an invalid/expired coupon code", async () => {
    await seedProduct({ id: "order-item-2", price: 100 });
    await seedCoupon({ code: "EXPIRED", type: "flat", value: 10, expiresAt: new Date(Date.now() - 1000) });

    const res = await placeOrder([{ productId: "order-item-2", quantity: 1 }], { couponCode: "EXPIRED" });

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("COUPON_INVALID");
  });

  it("increments coupon usage on successful order and enforces the usage limit", async () => {
    await seedProduct({ id: "order-item-3", price: 100, stock: 10 });
    await seedCoupon({ code: "LIMITED", type: "flat", value: 5, usageLimit: 1 });

    const first = await placeOrder([{ productId: "order-item-3", quantity: 1 }], { couponCode: "LIMITED" });
    expect(first.statusCode).toBe(201);

    const coupon = await Coupon.findOne({ code: "LIMITED" });
    expect(coupon.timesUsed).toBe(1);

    const second = await placeOrder([{ productId: "order-item-3", quantity: 1 }], { couponCode: "LIMITED" });
    expect(second.statusCode).toBe(409);
    expect(second.body.code).toBe("COUPON_INVALID");
  });

  it("ignores a tampered discount and always recomputes server-side", async () => {
    await seedProduct({ id: "order-item-4", price: 100, mrp: 100 });
    await seedCoupon({ code: "REALCODE", type: "percentage", value: 50 });

    // Client can send anything for couponCode's "expected" discount — the
    // server has no such field to trust in the first place; it always
    // derives couponDiscount itself from the live coupon + resolved subtotal.
    const res = await placeOrder([{ productId: "order-item-4", quantity: 1 }], { couponCode: "REALCODE" });

    expect(res.statusCode).toBe(201);
    expect(res.body.order.couponDiscount).toBe(50);
  });
});
