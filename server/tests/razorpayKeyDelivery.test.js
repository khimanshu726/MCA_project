import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";

/**
 * The browser needs Razorpay's key id to open the checkout modal. It used to
 * get it from VITE_RAZORPAY_KEY_ID, inlined at build time — which meant an
 * unset var compiled to `undefined` and the modal silently never opened, with
 * nothing failing at build, deploy, or boot. It now travels on the create-order
 * response instead, so these tests pin the two properties that made the swap
 * worth doing: the key id is actually there, and the secret still isn't.
 */

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async () => {
    const error = new Error("Invalid token");
    error.statusCode = 401;
    throw error;
  }),
  isFirebaseAdminConfigured: () => true,
}));

vi.mock("../config/razorpay.js", () => ({
  default: {
    orders: {
      create: vi.fn(async ({ receipt }) => ({ id: `order_mock_${receipt}` })),
    },
  },
}));

const TEST_KEY_ID = "rzp_test_AbCdEfGhIjKlMn";
const TEST_KEY_SECRET = "keySecretMustNeverReachTheBrowser";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("razorpay-key-delivery-test"));
});

beforeEach(() => {
  process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
});

afterEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const seedProduct = (overrides = {}) =>
  Product.create({
    id: "cards-key-test",
    name: "Test Product",
    description: "A test product",
    category: "Visiting Cards",
    images: ["https://example.com/image.jpg"],
    price: 100,
    mrp: 100,
    stock: 10,
    status: "active",
    ...overrides,
  });

const placeOrder = (paymentMethod) =>
  request(app)
    .post("/api/create-order")
    .field({
      customerName: "Test Buyer",
      phone: "9876543210",
      email: "buyer@example.com",
      streetAddress: "123 Test St",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      shippingCharge: "0",
      paymentMethod,
    })
    .field("lineItems", JSON.stringify([{ productId: "cards-key-test", quantity: 1 }]));

describe("create-order → Razorpay key delivery", () => {
  it("returns the key id the browser needs to open checkout", async () => {
    await seedProduct();

    const response = await placeOrder("upi");

    expect(response.statusCode).toBe(201);
    expect(response.body.razorpay.key_id).toBe(TEST_KEY_ID);
    expect(response.body.razorpay.order_id).toMatch(/^order_mock_/);
  });

  it("never returns the key secret", async () => {
    await seedProduct();

    const response = await placeOrder("upi");

    expect(JSON.stringify(response.body)).not.toContain(TEST_KEY_SECRET);
    expect(response.body.razorpay).not.toHaveProperty("key_secret");
  });

  it("sends the same key id the server holds, so the two cannot disagree", async () => {
    await seedProduct();
    // The whole point of sourcing the key from the response: rotate the
    // server's key and the browser follows, with no rebuild and no second
    // variable to forget.
    process.env.RAZORPAY_KEY_ID = "rzp_test_RotatedKey999";

    const response = await placeOrder("card");

    expect(response.body.razorpay.key_id).toBe("rzp_test_RotatedKey999");
  });

  it("omits the razorpay payload entirely for cash on delivery", async () => {
    await seedProduct();

    const response = await placeOrder("cod");

    expect(response.statusCode).toBe(201);
    expect(response.body.razorpay).toBeNull();
  });
});
