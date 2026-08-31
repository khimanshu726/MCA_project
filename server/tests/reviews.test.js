import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { appConfig } from "../config.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";

/**
 * Reviews are verified-buyer only and moderated: a non-buyer can't post, a
 * pending review is invisible publicly and uncounted, and only an admin
 * approval publishes it and moves the average.
 */
vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token !== "valid-token") {
      const error = new Error("Invalid token");
      error.statusCode = 401;
      throw error;
    }
    return { uid: "buyer-uid", email: "buyer@example.com", auth_time: Math.floor(Date.now() / 1000) };
  }),
  isFirebaseAdminConfigured: () => true,
}));

let mongoServer;
let adminToken;
const customerAuth = { Authorization: "Bearer valid-token" };
const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("reviews-test"));
  const admin = await User.create({ id: "admin-r", name: "Admin", email: "admin-r@ee.com", role: "admin" });
  adminToken = jwt.sign({ sub: admin.id }, appConfig.jwtSecret);
});

afterEach(async () => {
  await Review.deleteMany({});
  await Order.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({ role: { $ne: "admin" } });
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

const seedProduct = () =>
  Product.create({
    id: "rev-prod",
    name: "Reviewable Frame",
    description: "A frame you can review.",
    category: "Photo Frames",
    images: ["https://example.com/x.jpg"],
    price: 100,
    mrp: 120,
    stock: 10,
    status: "active",
  });

// Authenticating once creates the customer via upsert; return its id.
const ensureBuyer = async () => {
  await request(app).get("/api/products/rev-prod/reviews/eligibility").set(customerAuth);
  const user = await User.findOne({ email: "buyer@example.com" });
  return user.id;
};

const seedDeliveredOrder = (customerId) =>
  Order.create({
    id: "ord-1",
    orderId: "EE-REV-1",
    customerId,
    customerName: "Buyer",
    phone: "9999999999",
    address: { street: "1 St", city: "Purnia", state: "Bihar", pincode: "854301" },
    quantity: 1,
    price: 100,
    paymentMethod: "upi",
    paymentStatus: "Paid",
    orderStatus: "Delivered",
    lineItems: [{ productId: "rev-prod", quantity: 1 }],
  });

const submit = (payload) =>
  request(app).post("/api/products/rev-prod/reviews").set(customerAuth).send(payload);

describe("Product reviews (verified-buyer, moderated)", () => {
  it("blocks a non-buyer", async () => {
    await seedProduct();
    await ensureBuyer(); // exists, but has no order

    const eligibility = await request(app).get("/api/products/rev-prod/reviews/eligibility").set(customerAuth);
    expect(eligibility.body).toMatchObject({ eligible: false, reason: "not_purchased" });

    const res = await submit({ rating: 5, body: "Great frame" });
    expect(res.statusCode).toBe(403);
  });

  it("lets a verified buyer submit, held pending and invisible until approved; blocks a duplicate", async () => {
    await seedProduct();
    const customerId = await ensureBuyer();
    await seedDeliveredOrder(customerId);

    expect((await request(app).get("/api/products/rev-prod/reviews/eligibility").set(customerAuth)).body.eligible).toBe(
      true,
    );

    const post = await submit({ rating: 4, title: "Nice", body: "Good build quality." });
    expect(post.statusCode).toBe(201);
    expect(post.body.review.status).toBe("pending");

    const publicView = await request(app).get("/api/products/rev-prod/reviews");
    expect(publicView.body.reviews).toHaveLength(0);
    expect(publicView.body.summary.count).toBe(0);

    const duplicate = await submit({ rating: 3, body: "again" });
    expect(duplicate.statusCode).toBe(409);
  });

  it("publishes on admin approval and updates the summary", async () => {
    await seedProduct();
    const customerId = await ensureBuyer();
    await seedDeliveredOrder(customerId);
    await submit({ rating: 5, body: "Excellent." });

    const pending = await request(app).get("/api/admin/reviews?status=pending").set(adminAuth());
    expect(pending.body.reviews).toHaveLength(1);

    const approve = await request(app)
      .patch(`/api/admin/reviews/${pending.body.reviews[0].id}`)
      .set(adminAuth())
      .send({ status: "approved" });
    expect(approve.statusCode).toBe(200);

    const publicView = await request(app).get("/api/products/rev-prod/reviews");
    expect(publicView.body.reviews).toHaveLength(1);
    expect(publicView.body.summary).toMatchObject({ count: 1, average: 5 });
  });

  it("rejects an out-of-range rating", async () => {
    await seedProduct();
    const customerId = await ensureBuyer();
    await seedDeliveredOrder(customerId);

    expect((await submit({ rating: 9, body: "x" })).statusCode).toBe(400);
  });

  it("requires admin auth for moderation endpoints", async () => {
    const res = await request(app).get("/api/admin/reviews");
    expect(res.statusCode).toBe(401);
  });
});
