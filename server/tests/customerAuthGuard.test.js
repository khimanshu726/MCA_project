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
    // auth_time is what the session-age ceiling is measured against; a real
    // Firebase ID token always carries it.
    mockVerify.mockResolvedValue({
      uid: "firebase-uid-1",
      email: "buyer@example.com",
      auth_time: Math.floor(Date.now() / 1000),
    });

    const res = await placeOrder("good-token");

    expect(res.statusCode).toBe(201);
    const order = await Order.findOne({}).lean();
    expect(order.customerId).toBeTruthy();
  });
});

describe("server-enforced session lifetime", () => {
  /**
   * The security boundary for "logged in forever".
   *
   * Firebase refresh tokens never expire, so a client that keeps refreshing
   * can hold a technically-valid ID token indefinitely. The signature check
   * alone would accept it. The ceiling is enforced here instead, against the
   * signed auth_time claim — the moment the customer actually proved who they
   * were, which survives every refresh and cannot be edited by the client.
   */
  it("rejects a signature-valid token whose session has outlived the ceiling", async () => {
    const thirtyOneDaysAgo = Math.floor((Date.now() - 31 * 24 * 60 * 60 * 1000) / 1000);
    mockVerify.mockResolvedValue({
      uid: "firebase-uid-old",
      email: "long-lived@example.com",
      auth_time: thirtyOneDaysAgo,
    });

    const res = await placeOrder("perfectly-signed-but-ancient-token");

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("SESSION_EXPIRED");
    expect(await Order.countDocuments()).toBe(0);
  });

  it("accepts a session comfortably inside the ceiling", async () => {
    const tenDaysAgo = Math.floor((Date.now() - 10 * 24 * 60 * 60 * 1000) / 1000);
    mockVerify.mockResolvedValue({
      uid: "firebase-uid-recent",
      email: "recent@example.com",
      auth_time: tenDaysAgo,
    });

    const res = await placeOrder("good-token");

    expect(res.statusCode).toBe(201);
  });

  it("refuses a token carrying no auth_time at all", async () => {
    // Fails closed. A token we cannot date is a token whose freshness we
    // cannot prove, and guessing in the customer's favour here would grant
    // exactly the unbounded session this change exists to remove.
    mockVerify.mockResolvedValue({ uid: "firebase-uid-noauthtime", email: "noclaim@example.com" });

    const res = await placeOrder("token-without-auth-time");

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("SESSION_EXPIRED");
    expect(await Order.countDocuments()).toBe(0);
  });
});

describe("GET /api/health", () => {
  it("reports whether the server can verify customer logins at all", async () => {
    mockConfigured.mockReturnValue(false);

    const res = await request(app).get("/api/health").expect(200);

    expect(res.body.auth).toEqual({ firebaseAdminConfigured: false });
  });
});
