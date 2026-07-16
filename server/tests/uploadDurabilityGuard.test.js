import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { app } from "../index.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";

/**
 * Checkout's artwork upload is OPTIONAL, which makes the durability guard
 * delicate: refusing the whole route when storage isn't configured would block
 * every order, including cash-on-delivery ones carrying no file. The guard must
 * object to a doomed file and stay out of the way otherwise.
 */
vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async () => {
    const error = new Error("Invalid token");
    error.statusCode = 401;
    throw error;
  }),
  isFirebaseAdminConfigured: () => true,
}));

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let mongoServer;
const uploadsDir = path.resolve(process.cwd(), "uploads");
const envSnapshot = {};

/** Deletes files this suite wrote, never the tracked .gitkeep. */
const cleanUploads = () => {
  for (const entry of readdirSync(uploadsDir, { withFileTypes: true })) {
    if (entry.name !== ".gitkeep") {
      rmSync(path.join(uploadsDir, entry.name), { recursive: true, force: true });
    }
  }
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("upload-guard-test"));
  mkdirSync(uploadsDir, { recursive: true });
});

beforeEach(async () => {
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "NODE_ENV"]) {
    envSnapshot[key] = process.env[key];
    delete process.env[key];
  }

  await Product.create({
    id: "guard-product",
    name: "Guard Product",
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
  for (const [key, value] of Object.entries(envSnapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await Product.deleteMany({});
  await Order.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  // Leave the directory and its tracked .gitkeep — disk uploads need it.
  cleanUploads();
});

const placeOrder = () =>
  request(app)
    .post("/api/orders")
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
    .field("lineItems", JSON.stringify([{ productId: "guard-product", quantity: 1 }]));

describe("checkout artwork durability guard", () => {
  it("lets a no-file order through in production â€” the guard must not block checkout", async () => {
    process.env.NODE_ENV = "production";

    const res = await placeOrder();

    expect(res.statusCode).toBe(201);
    expect(await Order.countDocuments()).toBe(1);
  });

  it("refuses an order whose artwork could not be kept, rather than losing it", async () => {
    process.env.NODE_ENV = "production";

    const res = await placeOrder().attach("designFile", PNG_1X1, "artwork.png");

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe("STORAGE_NOT_CONFIGURED");
    // The order must NOT exist: taking money for artwork we dropped is worse
    // than refusing the upload.
    expect(await Order.countDocuments()).toBe(0);
  });

  it("accepts artwork in development, where local disk is real", async () => {
    const res = await placeOrder().attach("designFile", PNG_1X1, "artwork.png");

    expect(res.statusCode).toBe(201);
    expect(res.body.order.uploadedFileURL).toMatch(/^\/uploads\/order-/);
  });
});
