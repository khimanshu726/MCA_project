import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";

/**
 * optionalAuthenticateCustomer used to swallow every verification failure and
 * continue as a guest. That sounds forgiving and lost data: createOrder stores
 * `customerId: req.customer?.id`, so a signed-in customer whose token couldn't
 * be verified had their order written with no owner and it never appeared in
 * their history again — the link was never recorded, so no later fix restores
 * it.
 *
 * That is not hypothetical. Production ran with FIREBASE_ADMIN_* unset, so
 * every verification threw 503 and every "logged in" order was orphaned.
 */
const mockVerify = vi.fn();
const mockConfigured = vi.fn(() => true);

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: (token) => mockVerify(token),
  isFirebaseAdminConfigured: () => mockConfigured(),
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("customer-auth-guard-test"));
});

beforeEach(async () => {
  mockVerify.mockReset();
  mockConfigured.mockReturnValue(true);
  await Product.create({
    id: "auth-product",
    name: "Auth Product",
    description: "d",
    category: "Banners",
    images: ["https://example.com/i.jpg"],
    price: 100,
    mrp: 100,
    stock: 50,
    status: "active",
  });
});

afterEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const placeOrder = (token) => {
  const req = request(app).post("/api/orders");
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req
    .field({
      customerName: "Test Buyer",
      phone: "9876543210",
      email: "buyer@example.com",
      streetAddress: "123 Test St",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      paymentMethod: "cod",
      shippingCharge: "0",
    })
    .field("lineItems", JSON.stringify([{ productId: "auth-product", quantity: 1 }]));
};

describe("checkout with no credentials", () => {
  it("still works — a guest is a real customer, not an error", async () => {
    const res = await placeOrder();

    expect(res.statusCode).toBe(201);
    expect(mockVerify).not.toHaveBeenCalled();
    const order = await Order.findOne({}).lean();
    expect(order.customerId).toBeUndefined();
  });
});

describe("checkout with a token the server cannot verify", () => {
  it("REFUSES the order rather than silently filing it under nobody", async () => {
    const error = new Error("Invalid token");
    error.statusCode = 401;
    mockVerify.mockRejectedValue(error);

    const res = await placeOrder("expired-token");

    expect(res.statusCode).toBe(401);
    // The order must not exist: an owner-less order is invisible to the
    // customer forever, which is worse than making them log in again.
    expect(await Order.countDocuments()).toBe(0);
  });

  it("reports a 503 as a server problem, not 'your session expired'", async () => {
    // Exactly production's state: FIREBASE_ADMIN_* unset.
    const error = new Error("Firebase Admin authentication is not configured on the server.");
    error.statusCode = 503;
    mockVerify.mockRejectedValue(error);

    const res = await placeOrder("a-perfectly-good-token");

    expect(res.statusCode).toBe(503);
    // Telling a customer to log in again would send them round a loop that
    // cannot succeed — nothing they do fixes an unconfigured server.
    expect(res.body.message).toMatch(/not configured on the server/);
    expect(res.body.message).not.toMatch(/Session expired/);
    expect(await Order.countDocuments()).toBe(0);
  });
});

describe("checkout with a valid token", () => {
  it("attaches the order to the customer, so it appears in their history", async () => {
    mockVerify.mockResolvedValue({ uid: "firebase-uid-1", email: "buyer@example.com" });

    const res = await placeOrder("good-token");

    expect(res.statusCode).toBe(201);
    const order = await Order.findOne({}).lean();
    expect(order.customerId).toBeTruthy();
  });
});

describe("GET /api/health", () => {
  it("reports whether the server can verify customer logins at all", async () => {
    mockConfigured.mockReturnValue(false);

    const res = await request(app).get("/api/health").expect(200);

    expect(res.body.auth).toEqual({ firebaseAdminConfigured: false });
  });
});
