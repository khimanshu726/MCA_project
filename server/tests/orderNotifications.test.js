import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Capture every outgoing email without a real SMTP server.
const { sendMailMock } = vi.hoisted(() => ({ sendMailMock: vi.fn() }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: sendMailMock }) },
}));

// appConfig snapshots env at import, so force SMTP "configured" here — otherwise
// getTransporter returns null and every send is a no-op.
vi.mock("../config.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    appConfig: {
      ...actual.appConfig,
      smtpHost: "smtp.test.local",
      smtpUser: "smtp-user",
      smtpPass: "smtp-pass",
      smtpFrom: "orders@elite-empressions.test",
      adminNotificationEmail: "shop@elite-empressions.test",
    },
  };
});

import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import {
  buildOrderConfirmationEmail,
  notifyOrderConfirmed,
} from "../services/notificationService.js";
import { recordPaymentCaptured } from "../services/paymentService.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("order-notifications-test"));
});

afterEach(async () => {
  await Order.deleteMany({});
  await Payment.deleteMany({});
  sendMailMock.mockReset();
  sendMailMock.mockResolvedValue({ messageId: "test" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// recordPaymentCaptured dispatches the email fire-and-forget, so the send
// completes after it returns. Poll until the condition holds (or time out).
const waitFor = async (predicate, { timeout = 1000, interval = 10 } = {}) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
};

let counter = 0;
const makeOrderData = (overrides = {}) => {
  counter += 1;
  return {
    id: crypto.randomUUID(),
    orderId: `EE-NOTIFY-${counter}`,
    customerName: "Aarav Sharma",
    phone: "9876543210",
    email: "aarav@example.com",
    address: { street: "221B Baker Street", landmark: "Near Park", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
    productName: "Storefront Banner, Business Cards",
    quantity: 3,
    price: 1200,
    subtotal: 1300,
    discountTotal: 100,
    shippingCharge: 0,
    platformFee: 0,
    taxAmount: 0,
    couponCode: "SAVE100",
    paymentMethod: "cod",
    paymentStatus: "Pending",
    orderStatus: "Placed",
    lineItems: [
      { productId: "storefront-banner", name: "Storefront Banner", quantity: 1, unitPrice: 900, totalPrice: 900, customizationText: "Logo top-left" },
      { productId: "business-cards", name: "Business Cards", quantity: 2, unitPrice: 200, totalPrice: 400, customizationText: "" },
    ],
    ...overrides,
  };
};

describe("buildOrderConfirmationEmail", () => {
  it("includes the order number, every line item, the total, and the address", () => {
    const { subject, text, html } = buildOrderConfirmationEmail(makeOrderData());

    expect(subject).toContain("EE-NOTIFY-");
    for (const body of [text, html]) {
      expect(body).toContain("Storefront Banner");
      expect(body).toContain("Business Cards");
      expect(body).toContain("Aarav Sharma");
      expect(body).toContain("400001");
      // Total is rendered with the rupee symbol.
      expect(body).toContain("₹");
    }
    // Coupon discount surfaces when present.
    expect(text).toContain("SAVE100");
  });

  it("escapes HTML in customer-supplied fields so markup can't leak into the email", () => {
    const { html } = buildOrderConfirmationEmail(
      makeOrderData({
        customerName: "Mallory <b>",
        lineItems: [
          { name: "Poster", quantity: 1, unitPrice: 100, totalPrice: 100, customizationText: "<script>alert(1)</script>" },
        ],
      }),
    );

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Mallory &lt;b&gt;");
  });

  it("falls back to the legacy single-product fields when lineItems is empty", () => {
    const { text } = buildOrderConfirmationEmail(
      makeOrderData({ lineItems: [], productName: "Vinyl Sticker", quantity: 5, price: 250 }),
    );
    expect(text).toContain("Vinyl Sticker");
  });
});

describe("notifyOrderConfirmed", () => {
  it("sends the customer confirmation and the admin alert, and marks the order", async () => {
    const data = makeOrderData();
    await Order.create(data);

    const result = await notifyOrderConfirmed(data);

    expect(result.delivered).toBe(true);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
    const recipients = sendMailMock.mock.calls.map(([mail]) => mail.to);
    expect(recipients).toContain("aarav@example.com");
    expect(recipients).toContain("shop@elite-empressions.test");
    // The customer email carries an HTML body.
    const customerMail = sendMailMock.mock.calls.find(([mail]) => mail.to === "aarav@example.com")[0];
    expect(customerMail.html).toContain("Storefront Banner");

    const persisted = await Order.findOne({ orderId: data.orderId });
    expect(persisted.confirmationEmailSentAt).toBeInstanceOf(Date);
  });

  it("dispatches exactly once even when called twice (webhook + verify race)", async () => {
    const data = makeOrderData();
    await Order.create(data);

    const [first, second] = await Promise.all([notifyOrderConfirmed(data), notifyOrderConfirmed(data)]);

    const delivered = [first, second].filter((r) => r.delivered);
    const skipped = [first, second].filter((r) => r.reason === "already-sent");
    expect(delivered).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    // One confirmation + one admin alert — never doubled.
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it("no-ops without an email address rather than claiming the send", async () => {
    const data = makeOrderData({ email: "" });
    await Order.create(data);

    const result = await notifyOrderConfirmed(data);

    expect(result).toEqual({ delivered: false, reason: "missing-recipient" });
    expect(sendMailMock).not.toHaveBeenCalled();
    const persisted = await Order.findOne({ orderId: data.orderId });
    expect(persisted.confirmationEmailSentAt).toBeNull();
  });

  it("releases the claim when the send fails, so a retry can try again", async () => {
    const data = makeOrderData();
    await Order.create(data);
    sendMailMock.mockRejectedValueOnce(new Error("SMTP unavailable"));

    await expect(notifyOrderConfirmed(data)).rejects.toThrow("SMTP unavailable");

    const persisted = await Order.findOne({ orderId: data.orderId });
    expect(persisted.confirmationEmailSentAt).toBeNull();

    // A subsequent attempt now succeeds and delivers.
    const retry = await notifyOrderConfirmed(data);
    expect(retry.delivered).toBe(true);
  });
});

describe("payment capture confirmation (online orders)", () => {
  it("emails the confirmation when a pending online order is captured", async () => {
    const data = makeOrderData({
      paymentMethod: "card",
      orderStatus: "PaymentPending",
      paymentStatus: "Pending",
      razorpayOrderId: "order_TESTCAPTURE1",
    });
    await Order.create(data);

    await recordPaymentCaptured({
      razorpayOrderId: "order_TESTCAPTURE1",
      razorpayPaymentId: "pay_TEST1",
      method: "card",
    });
    const sent = await waitFor(() =>
      sendMailMock.mock.calls.some(([mail]) => mail.to === "aarav@example.com"),
    );
    expect(sent).toBe(true);

    const persisted = await Order.findOne({ orderId: data.orderId });
    expect(persisted.orderStatus).toBe("Placed");
    expect(persisted.confirmationEmailSentAt).toBeInstanceOf(Date);
  });

  it("does not send a second confirmation when the same capture is delivered twice", async () => {
    const data = makeOrderData({
      paymentMethod: "card",
      orderStatus: "PaymentPending",
      paymentStatus: "Pending",
      razorpayOrderId: "order_TESTCAPTURE2",
    });
    await Order.create(data);

    await recordPaymentCaptured({ razorpayOrderId: "order_TESTCAPTURE2", razorpayPaymentId: "pay_TEST2", method: "card" });
    await waitFor(() => sendMailMock.mock.calls.some(([mail]) => mail.to === "aarav@example.com"));
    // A duplicate delivery of the same capture (webhook after client verify).
    await recordPaymentCaptured({ razorpayOrderId: "order_TESTCAPTURE2", razorpayPaymentId: "pay_TEST2", method: "card" });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const customerSends = sendMailMock.mock.calls.filter(([mail]) => mail.to === "aarav@example.com");
    expect(customerSends).toHaveLength(1);
  });
});
