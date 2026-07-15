import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { Product } from "../models/Product.js";
import { WebhookLog } from "../models/WebhookLog.js";
import { User } from "../models/User.js";

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token === "valid-token") {
      return { uid: "payment-tester-uid", email: "payment-tester@example.com" };
    }
    const error = new Error("Invalid token");
    error.statusCode = 401;
    throw error;
  }),
  isFirebaseAdminConfigured: () => true,
}));

const TEST_KEY_SECRET = "test_key_secret";
const TEST_WEBHOOK_SECRET = "test_webhook_secret";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("payments-test"));
  // Signature helpers read these at request time, so overriding here wins
  // regardless of what dotenv loaded at import.
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
});

afterEach(async () => {
  await Order.deleteMany({});
  await Payment.deleteMany({});
  await Product.deleteMany({});
  await WebhookLog.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

let orderCounter = 0;

const seedPendingOrder = (overrides = {}) => {
  orderCounter += 1;
  return Order.create({
    id: crypto.randomUUID(),
    orderId: `EE-TEST-${orderCounter}`,
    customerName: "Pay Tester",
    phone: "9876543210",
    email: "pay@example.com",
    address: { street: "1 Pay St", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
    productName: "Test Product",
    quantity: 1,
    price: 218,
    paymentMethod: "upi",
    paymentStatus: "Pending",
    orderStatus: "PaymentPending",
    razorpayOrderId: `order_test_${orderCounter}`,
    statusHistory: [{ status: "PaymentPending", changedAt: new Date(), note: "Awaiting payment confirmation." }],
    lineItems: [{ productId: "pay-product", name: "Test Product", quantity: 1, unitPrice: 79, totalPrice: 79 }],
    ...overrides,
  });
};

const paymentSignature = (razorpayOrderId, razorpayPaymentId) =>
  crypto.createHmac("sha256", TEST_KEY_SECRET).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");

const postWebhook = (payload, { eventId, tamperSignature = false } = {}) => {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", TEST_WEBHOOK_SECRET).update(body).digest("hex");
  return request(app)
    .post("/api/webhooks/razorpay")
    .set("Content-Type", "application/json")
    .set("x-razorpay-signature", tamperSignature ? signature.replace(/^./, signature[0] === "a" ? "b" : "a") : signature)
    .set("x-razorpay-event-id", eventId || `evt_${crypto.randomUUID()}`)
    .send(body);
};

const capturedWebhookPayload = (order, paymentId) => ({
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: paymentId,
        order_id: order.razorpayOrderId,
        amount: order.price * 100,
        currency: "INR",
        method: "upi",
        status: "captured",
      },
    },
  },
});

describe("POST /api/verify-payment", () => {
  it("rejects an invalid signature and leaves the order unconfirmed", async () => {
    const order = await seedPendingOrder();

    const res = await request(app).post("/api/verify-payment").send({
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: "pay_forged",
      razorpay_signature: "0".repeat(64),
    });

    expect(res.statusCode).toBe(400);
    const stored = await Order.findOne({ orderId: order.orderId });
    expect(stored.orderStatus).toBe("PaymentPending");
    expect(stored.paymentStatus).toBe("Pending");
    expect(await Payment.countDocuments({})).toBe(0);
  });

  it("confirms the order and records a captured Payment on a valid signature", async () => {
    const order = await seedPendingOrder();
    const paymentId = "pay_valid_1";

    const res = await request(app).post("/api/verify-payment").send({
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: paymentSignature(order.razorpayOrderId, paymentId),
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.order.orderStatus).toBe("Placed");
    expect(res.body.order.paymentStatus).toBe("Paid");
    expect(res.body.order.statusHistory.map((entry) => entry.status)).toEqual(["PaymentPending", "Placed"]);

    const payment = await Payment.findOne({ razorpayPaymentId: paymentId });
    expect(payment).not.toBeNull();
    expect(payment.status).toBe("captured");
    expect(payment.razorpayOrderId).toBe(order.razorpayOrderId);
    expect(payment.orderId).toBe(order.orderId);
    expect(payment.amount).toBe(218);
  });

  it("is idempotent when the same payment is verified twice", async () => {
    const order = await seedPendingOrder();
    const paymentId = "pay_valid_2";
    const body = {
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: paymentSignature(order.razorpayOrderId, paymentId),
    };

    await request(app).post("/api/verify-payment").send(body);
    const second = await request(app).post("/api/verify-payment").send(body);

    expect(second.statusCode).toBe(200);
    expect(await Payment.countDocuments({ razorpayPaymentId: paymentId })).toBe(1);
    const stored = await Order.findOne({ orderId: order.orderId });
    expect(stored.statusHistory.filter((entry) => entry.status === "Placed")).toHaveLength(1);
  });

  it("404s a signature that matches no known order", async () => {
    const res = await request(app).post("/api/verify-payment").send({
      razorpay_order_id: "order_ghost",
      razorpay_payment_id: "pay_ghost",
      razorpay_signature: paymentSignature("order_ghost", "pay_ghost"),
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("POST /api/webhooks/razorpay", () => {
  it("rejects a tampered signature with 400 and logs the attempt", async () => {
    const order = await seedPendingOrder();
    const res = await postWebhook(capturedWebhookPayload(order, "pay_wh_bad"), { tamperSignature: true });

    expect(res.statusCode).toBe(400);
    expect(await WebhookLog.countDocuments({ signatureValid: false })).toBe(1);
    expect((await Order.findOne({ orderId: order.orderId })).orderStatus).toBe("PaymentPending");
  });

  it("processes payment.captured: confirms the order even if the browser never called verify", async () => {
    const order = await seedPendingOrder();
    const res = await postWebhook(capturedWebhookPayload(order, "pay_wh_1"));

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("processed");

    const stored = await Order.findOne({ orderId: order.orderId });
    expect(stored.orderStatus).toBe("Placed");
    expect(stored.paymentStatus).toBe("Paid");

    const payment = await Payment.findOne({ razorpayPaymentId: "pay_wh_1" });
    expect(payment.status).toBe("captured");
    expect(payment.method).toBe("upi");
    expect(payment.gatewayResponse.id).toBe("pay_wh_1");

    expect((await WebhookLog.findOne({ event: "payment.captured" })).processingStatus).toBe("processed");
  });

  it("skips a duplicate delivery of the same event id without reprocessing", async () => {
    const order = await seedPendingOrder();
    const payload = capturedWebhookPayload(order, "pay_wh_2");

    await postWebhook(payload, { eventId: "evt_dup_1" });
    const second = await postWebhook(payload, { eventId: "evt_dup_1" });

    expect(second.statusCode).toBe(200);
    expect(second.body.status).toBe("skipped_duplicate");
    expect(await Payment.countDocuments({ razorpayPaymentId: "pay_wh_2" })).toBe(1);
    expect((await Order.findOne({ orderId: order.orderId })).statusHistory.filter((e) => e.status === "Placed")).toHaveLength(1);
  });

  it("does not double-confirm when the client verify already ran (webhook + verify race)", async () => {
    const order = await seedPendingOrder();
    const paymentId = "pay_race_1";

    await request(app).post("/api/verify-payment").send({
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: paymentSignature(order.razorpayOrderId, paymentId),
    });
    const webhookRes = await postWebhook(capturedWebhookPayload(order, paymentId));

    expect(webhookRes.statusCode).toBe(200);
    expect(await Payment.countDocuments({ razorpayPaymentId: paymentId })).toBe(1);
    const stored = await Order.findOne({ orderId: order.orderId });
    expect(stored.statusHistory.filter((entry) => entry.status === "Placed")).toHaveLength(1);
  });

  it("records payment.failed with the reason while keeping the order retryable", async () => {
    const order = await seedPendingOrder();
    const res = await postWebhook({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_wh_fail",
            order_id: order.razorpayOrderId,
            error_code: "BAD_REQUEST_ERROR",
            error_description: "Payment declined by bank.",
          },
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const payment = await Payment.findOne({ razorpayPaymentId: "pay_wh_fail" });
    expect(payment.status).toBe("failed");
    expect(payment.failureReason).toBe("Payment declined by bank.");

    // Still PaymentPending: the customer can retry the same Razorpay order.
    expect((await Order.findOne({ orderId: order.orderId })).orderStatus).toBe("PaymentPending");
  });

  it("applies refund.processed to the payment and marks the order refunded", async () => {
    const order = await seedPendingOrder();
    await postWebhook(capturedWebhookPayload(order, "pay_wh_refund"));

    const res = await postWebhook({
      event: "refund.processed",
      payload: {
        refund: {
          entity: { id: "rfnd_1", payment_id: "pay_wh_refund", amount: 21800, status: "processed" },
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const payment = await Payment.findOne({ razorpayPaymentId: "pay_wh_refund" });
    expect(payment.status).toBe("refunded");
    expect(payment.refundId).toBe("rfnd_1");
    expect(payment.refundHistory).toHaveLength(1);

    const stored = await Order.findOne({ orderId: order.orderId });
    expect(stored.orderStatus).toBe("Refunded");
    expect(stored.paymentStatus).toBe("Refunded");
  });

  it("acknowledges but ignores unhandled event types", async () => {
    const res = await postWebhook({ event: "settlement.processed", payload: {} });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ignored");
  });
});

describe("Payment reservation lifecycle", () => {
  it("excludes PaymentPending and PaymentFailed orders from the customer's order history", async () => {
    // Place a real COD order to establish the customer record + id.
    await Product.create({
      id: "history-product",
      name: "History Product",
      description: "d",
      category: "Visiting Cards",
      images: ["https://example.com/i.jpg"],
      price: 100,
      mrp: 100,
      stock: 10,
      status: "active",
    });
    const placed = await request(app)
      .post("/api/orders")
      .set("Authorization", "Bearer valid-token")
      .field({
        customerName: "Pay Tester",
        phone: "9876543210",
        email: "payment-tester@example.com",
        streetAddress: "1 Pay St",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        paymentMethod: "cod",
      })
      .field("lineItems", JSON.stringify([{ productId: "history-product", quantity: 1 }]));
    expect(placed.statusCode).toBe(201);
    const customerId = placed.body.order.customerId;

    await seedPendingOrder({ customerId });
    await seedPendingOrder({ customerId, orderStatus: "PaymentFailed" });

    const res = await request(app).get("/api/orders/customer").set("Authorization", "Bearer valid-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].orderId).toBe(placed.body.order.orderId);
  });

  it("cancel-payment releases reserved stock and marks the reservation PaymentFailed", async () => {
    await Product.create({
      id: "pay-product",
      name: "Pay Product",
      description: "d",
      category: "Visiting Cards",
      images: ["https://example.com/i.jpg"],
      price: 79,
      mrp: 79,
      stock: 3, // 2 units already reserved by the pending order below
      status: "active",
    });
    const order = await seedPendingOrder({
      lineItems: [{ productId: "pay-product", name: "Pay Product", quantity: 2, unitPrice: 79, totalPrice: 158 }],
    });

    const res = await request(app).post(`/api/orders/customer/${order.orderId}/cancel-payment`);

    expect(res.statusCode).toBe(200);
    expect(res.body.order.orderStatus).toBe("PaymentFailed");
    expect((await Product.findOne({ id: "pay-product" })).stock).toBe(5);

    // Second call must not restore stock twice.
    const again = await request(app).post(`/api/orders/customer/${order.orderId}/cancel-payment`);
    expect(again.statusCode).toBe(409);
    expect((await Product.findOne({ id: "pay-product" })).stock).toBe(5);
  });

  it("rejects cancel-payment on an order that is already confirmed", async () => {
    const order = await seedPendingOrder({ orderStatus: "Placed", paymentStatus: "Paid" });

    const res = await request(app).post(`/api/orders/customer/${order.orderId}/cancel-payment`);
    expect(res.statusCode).toBe(409);
  });

  it("keeps new online orders out of Placed until verification", async () => {
    const order = await seedPendingOrder();
    expect(order.orderStatus).toBe("PaymentPending");

    const paymentId = "pay_lifecycle_1";
    await request(app).post("/api/verify-payment").send({
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: paymentSignature(order.razorpayOrderId, paymentId),
    });

    const stored = await Order.findOne({ orderId: order.orderId });
    expect(stored.orderStatus).toBe("Placed");
  });
});
