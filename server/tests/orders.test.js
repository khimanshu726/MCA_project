import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token === "valid-token") {
      return { uid: "order-owner-uid", email: "order-owner@example.com" };
    }
    if (token === "other-token") {
      return { uid: "other-uid", email: "other@example.com" };
    }
    const error = new Error("Invalid token");
    error.statusCode = 401;
    throw error;
  }),
  isFirebaseAdminConfigured: () => true,
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("orders-test"));
});

afterEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await User.deleteMany({});
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

const placeOrder = (lineItems, overrides = {}) =>
  request(app)
    .post("/api/orders")
    .field({ ...baseOrderFields, ...overrides })
    .field("lineItems", JSON.stringify(lineItems));

describe("Order API Routes", () => {
  it("should block unauthenticated access to the Admin getOrders route (/api/admin/orders)", async () => {
    const res = await request(app).get("/api/admin/orders");
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/Authentication required/i);
  });
});

describe("POST /api/orders — server-side price/stock validation", () => {
  it("resolves price and name from the live product, ignoring anything the client sends", async () => {
    await seedProduct({ id: "cards-1", price: 50, mrp: 60, stock: 10 });

    const res = await placeOrder([
      { productId: "cards-1", name: "Fake Name", quantity: 2, unitPrice: 0.01 },
    ]);

    expect(res.statusCode).toBe(201);
    expect(res.body.order.lineItems[0]).toMatchObject({
      productId: "cards-1",
      name: "Test Product cards-1",
      unitPrice: 50,
      totalPrice: 100,
    });
    expect(res.body.order.subtotal).toBe(100);
  });

  it("decrements stock on a successful order", async () => {
    await seedProduct({ id: "cards-2", stock: 10 });

    const res = await placeOrder([{ productId: "cards-2", quantity: 3 }]);
    expect(res.statusCode).toBe(201);

    const product = await Product.findOne({ id: "cards-2" });
    expect(product.stock).toBe(7);
  });

  it("rejects an order referencing a product that does not exist", async () => {
    const res = await placeOrder([{ productId: "does-not-exist", quantity: 1 }]);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("rejects an order referencing a draft (inactive) product", async () => {
    await seedProduct({ id: "draft-1", status: "draft" });

    const res = await placeOrder([{ productId: "draft-1", quantity: 1 }]);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("rejects an order when the requested quantity exceeds stock, and leaves stock untouched", async () => {
    await seedProduct({ id: "low-stock", stock: 2 });

    const res = await placeOrder([{ productId: "low-stock", quantity: 5 }]);

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("OUT_OF_STOCK");
    expect(res.body.items[0]).toMatchObject({ productId: "low-stock", requested: 5, available: 2 });

    const product = await Product.findOne({ id: "low-stock" });
    expect(product.stock).toBe(2);
  });

  it("restores stock already decremented earlier in the request when a later item fails", async () => {
    await seedProduct({ id: "ok-item", stock: 10 });
    await seedProduct({ id: "short-item", stock: 1 });

    const res = await placeOrder([
      { productId: "ok-item", quantity: 5 },
      { productId: "short-item", quantity: 5 },
    ]);

    expect(res.statusCode).toBe(409);

    const okProduct = await Product.findOne({ id: "ok-item" });
    expect(okProduct.stock).toBe(10); // compensated back to original
  });

  it("computes subtotal/platform fee/tax/shipping/total server-side", async () => {
    await seedProduct({ id: "priced", price: 100, mrp: 120, stock: 10 });

    const res = await placeOrder([{ productId: "priced", quantity: 2 }], { shippingCharge: "999" });

    expect(res.statusCode).toBe(201);
    expect(res.body.order.subtotal).toBe(200);
    expect(res.body.order.discountTotal).toBe(40);
    // shippingCharge submitted by the client is ignored — the server derives
    // shipping from pricingService based on the resolved subtotal.
    expect(res.body.order.shippingCharge).not.toBe(999);
  });

  it("allows exactly one of two concurrent orders to succeed against a product with stock of 1", async () => {
    await seedProduct({ id: "contested", stock: 1 });

    const [first, second] = await Promise.all([
      placeOrder([{ productId: "contested", quantity: 1 }]),
      placeOrder([{ productId: "contested", quantity: 1 }]),
    ]);

    const statuses = [first.statusCode, second.statusCode].sort();
    expect(statuses).toEqual([201, 409]);

    const product = await Product.findOne({ id: "contested" });
    expect(product.stock).toBe(0);

    const orderCount = await Order.countDocuments({});
    expect(orderCount).toBe(1);
  });
});

describe("GET /api/orders/customer/:id — ownership-checked single-order lookup", () => {
  it("returns a guest order to an unauthenticated caller", async () => {
    await seedProduct({ id: "guest-lookup", stock: 10 });
    const placed = await placeOrder([{ productId: "guest-lookup", quantity: 1 }]);

    const res = await request(app).get(`/api/orders/customer/${placed.body.order.orderId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.order.orderId).toBe(placed.body.order.orderId);
  });

  it("404s a guest order for an authenticated caller", async () => {
    await seedProduct({ id: "guest-lookup-2", stock: 10 });
    const placed = await placeOrder([{ productId: "guest-lookup-2", quantity: 1 }]);

    const res = await request(app)
      .get(`/api/orders/customer/${placed.body.order.orderId}`)
      .set("Authorization", "Bearer valid-token");
    expect(res.statusCode).toBe(404);
  });

  it("returns an authenticated customer's own order", async () => {
    await seedProduct({ id: "owner-lookup", stock: 10 });
    const placed = await request(app)
      .post("/api/orders")
      .set("Authorization", "Bearer valid-token")
      .field({ ...baseOrderFields, email: "order-owner@example.com" })
      .field("lineItems", JSON.stringify([{ productId: "owner-lookup", quantity: 1 }]));

    const res = await request(app)
      .get(`/api/orders/customer/${placed.body.order.orderId}`)
      .set("Authorization", "Bearer valid-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.order.orderId).toBe(placed.body.order.orderId);
  });

  it("404s another authenticated customer's order", async () => {
    await seedProduct({ id: "owner-lookup-2", stock: 10 });
    const placed = await request(app)
      .post("/api/orders")
      .set("Authorization", "Bearer valid-token")
      .field({ ...baseOrderFields, email: "order-owner@example.com" })
      .field("lineItems", JSON.stringify([{ productId: "owner-lookup-2", quantity: 1 }]));

    const res = await request(app)
      .get(`/api/orders/customer/${placed.body.order.orderId}`)
      .set("Authorization", "Bearer other-token");

    expect(res.statusCode).toBe(404);
  });

  it("404s a nonexistent order id", async () => {
    const res = await request(app).get("/api/orders/customer/does-not-exist");
    expect(res.statusCode).toBe(404);
  });
});

describe("Order status lifecycle", () => {
  it("starts a new order as Placed with a statusHistory entry", async () => {
    await seedProduct({ id: "lifecycle-1", stock: 10 });
    const res = await placeOrder([{ productId: "lifecycle-1", quantity: 1 }]);

    expect(res.body.order.orderStatus).toBe("Placed");
    expect(res.body.order.statusHistory).toHaveLength(1);
    expect(res.body.order.statusHistory[0].status).toBe("Placed");
  });
});

describe("POST /api/orders/customer/:id/cancel", () => {
  it("cancels a Placed order, restores stock, and appends statusHistory", async () => {
    await seedProduct({ id: "cancel-1", stock: 5 });
    const placed = await placeOrder([{ productId: "cancel-1", quantity: 2 }]);
    expect((await Product.findOne({ id: "cancel-1" })).stock).toBe(3);

    const res = await request(app).post(`/api/orders/customer/${placed.body.order.orderId}/cancel`);

    expect(res.statusCode).toBe(200);
    expect(res.body.order.orderStatus).toBe("Cancelled");
    expect(res.body.order.statusHistory).toHaveLength(2);
    expect((await Product.findOne({ id: "cancel-1" })).stock).toBe(5);
  });

  it("rejects cancelling an order that is already Delivered", async () => {
    await seedProduct({ id: "cancel-2", stock: 5 });
    const placed = await placeOrder([{ productId: "cancel-2", quantity: 1 }]);
    // Admin status transitions go through an authenticated admin route (out
    // of scope here) — set the precondition directly against the model.
    await Order.findOneAndUpdate({ orderId: placed.body.order.orderId }, { orderStatus: "Delivered" });

    const res = await request(app).post(`/api/orders/customer/${placed.body.order.orderId}/cancel`);
    expect(res.statusCode).toBe(409);
  });

  it("404s cancelling a guest order as a different authenticated customer", async () => {
    await seedProduct({ id: "cancel-3", stock: 5 });
    const placed = await placeOrder([{ productId: "cancel-3", quantity: 1 }]);

    const res = await request(app)
      .post(`/api/orders/customer/${placed.body.order.orderId}/cancel`)
      .set("Authorization", "Bearer other-token");
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /api/orders/customer/:id/return", () => {
  it("rejects returning an order that has not been delivered yet", async () => {
    await seedProduct({ id: "return-1", stock: 5 });
    const placed = await placeOrder([{ productId: "return-1", quantity: 1 }]);

    const res = await request(app).post(`/api/orders/customer/${placed.body.order.orderId}/return`);
    expect(res.statusCode).toBe(409);
  });

  it("returns a Delivered order and appends statusHistory", async () => {
    await seedProduct({ id: "return-2", stock: 5 });
    const placed = await placeOrder([{ productId: "return-2", quantity: 1 }]);

    await Order.findOneAndUpdate(
      { orderId: placed.body.order.orderId },
      {
        orderStatus: "Delivered",
        statusHistory: [
          { status: "Placed", changedAt: new Date() },
          { status: "Delivered", changedAt: new Date() },
        ],
      },
    );

    const res = await request(app).post(`/api/orders/customer/${placed.body.order.orderId}/return`);
    expect(res.statusCode).toBe(200);
    expect(res.body.order.orderStatus).toBe("Returned");
    expect(res.body.order.statusHistory.map((entry) => entry.status)).toEqual(["Placed", "Delivered", "Returned"]);
  });
});
