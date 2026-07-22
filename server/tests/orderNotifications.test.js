import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Capture every outgoing email without hitting Resend.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    constructor() {
      this.emails = { send: sendMock };
    }
  },
}));

// Force email "configured" so the service builds a (mocked) client.
vi.mock("../config.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    appConfig: {
      ...actual.appConfig,
      resendApiKey: "re_test_key",
      emailFrom: "Elite Impressions <orders@test.local>",
      adminNotificationEmail: "shop@test.local",
      storefrontUrl: "https://test.local",
      emailFromIsDefault: false,
      adminEmailIsDefault: false,
    },
  };
});

import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { orderConfirmation } from "../services/email/templates/orderConfirmation.js";
import { notifyOrderConfirmed } from "../services/email/resendService.js";
import { recordPaymentCaptured } from "../services/paymentService.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("order-notifications-test"));
});

afterEach(async () => {
  await Order.deleteMany({});
  await Payment.deleteMany({});
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "email_test" }, error: null });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

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

const customerSends = () => sendMock.mock.calls.filter(([mail]) => mail.to === "aarav@example.com");

describe("orderConfirmation template", () => {
  it("includes the order number, every line item, the total, and the address", () => {
    const { subject, text, html } = orderConfirmation(makeOrderData());
    expect(subject).toContain("EE-NOTIFY-");
    for (const body of [text, html]) {
      expect(body).toContain("Storefront Banner");
      expect(body).toContain("Business Cards");
      expect(body).toContain("Aarav Sharma");
      expect(body).toContain("400001");
      expect(body).toContain("₹");
    }
    expect(text).toContain("SAVE100");
  });

  it("escapes HTML in customer-supplied fields", () => {
    const { html } = orderConfirmation(
      makeOrderData({
        customerName: "Mallory <b>",
        lineItems: [{ name: "Poster", quantity: 1, unitPrice: 100, totalPrice: 100, customizationText: "<script>alert(1)</script>" }],
      }),
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Mallory &lt;b&gt;");
  });

  it("surfaces the payment id for a paid online order", () => {
    const { html } = orderConfirmation(makeOrderData({ paymentMethod: "card", paymentStatus: "Paid", razorpayPaymentId: "pay_ABC123" }));
    expect(html).toContain("pay_ABC123");
  });
});

describe("notifyOrderConfirmed", () => {
  it("sends the customer confirmation and the admin alert, and marks the order", async () => {
    const data = makeOrderData();
    await Order.create(data);

    const result = await notifyOrderConfirmed(data);

    expect(result.delivered).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(2);
    const recipients = sendMock.mock.calls.map(([mail]) => mail.to);
    expect(recipients).toContain("aarav@example.com");
    expect(recipients).toContain("shop@test.local");
    const customerMail = sendMock.mock.calls.find(([mail]) => mail.to === "aarav@example.com")[0];
    expect(customerMail.html).toContain("Storefront Banner");
    expect(customerMail.from).toBe("Elite Impressions <orders@test.local>");

    const persisted = await Order.findOne({ orderId: data.orderId });
    expect(persisted.confirmationEmailSentAt).toBeInstanceOf(Date);
  });

  it("dispatches exactly once even when called twice (webhook + verify race)", async () => {
    const data = makeOrderData();
    await Order.create(data);

    const [first, second] = await Promise.all([notifyOrderConfirmed(data), notifyOrderConfirmed(data)]);

    expect([first, second].filter((r) => r.delivered)).toHaveLength(1);
    expect([first, second].filter((r) => r.reason === "already-sent")).toHaveLength(1);
    expect(sendMock).toHaveBeenCalledTimes(2); // one confirmation + one admin
  });

  it("no-ops without an email address rather than claiming the send", async () => {
    const data = makeOrderData({ email: "" });
    await Order.create(data);

    const result = await notifyOrderConfirmed(data);

    expect(result).toEqual({ delivered: false, reason: "missing-recipient" });
    expect(sendMock).not.toHaveBeenCalled();
    const persisted = await Order.findOne({ orderId: data.orderId });
    expect(persisted.confirmationEmailSentAt).toBeNull();
  });

  it("releases the claim when the customer send fails, so a retry can try again", async () => {
    const data = makeOrderData();
    await Order.create(data);
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "Resend rejected" } });

    const failed = await notifyOrderConfirmed(data);
    expect(failed.delivered).toBe(false);

    let persisted = await Order.findOne({ orderId: data.orderId });
    expect(persisted.confirmationEmailSentAt).toBeNull();

    const retry = await notifyOrderConfirmed(data);
    expect(retry.delivered).toBe(true);
  });
});

describe("payment capture confirmation (online orders)", () => {
  it("emails the confirmation when a pending online order is captured", async () => {
    const data = makeOrderData({ paymentMethod: "card", orderStatus: "PaymentPending", paymentStatus: "Pending", razorpayOrderId: "order_CAP1" });
    await Order.create(data);

    await recordPaymentCaptured({ razorpayOrderId: "order_CAP1", razorpayPaymentId: "pay_CAP1", method: "card" });
    const sent = await waitFor(() => customerSends().length > 0);
    expect(sent).toBe(true);

    const persisted = await Order.findOne({ orderId: data.orderId });
    expect(persisted.orderStatus).toBe("Placed");
    expect(persisted.confirmationEmailSentAt).toBeInstanceOf(Date);
  });

  it("does not send a second confirmation when the same capture is delivered twice", async () => {
    const data = makeOrderData({ paymentMethod: "card", orderStatus: "PaymentPending", paymentStatus: "Pending", razorpayOrderId: "order_CAP2" });
    await Order.create(data);

    await recordPaymentCaptured({ razorpayOrderId: "order_CAP2", razorpayPaymentId: "pay_CAP2", method: "card" });
    await waitFor(() => customerSends().length > 0);
    await recordPaymentCaptured({ razorpayOrderId: "order_CAP2", razorpayPaymentId: "pay_CAP2", method: "card" });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(customerSends()).toHaveLength(1);
  });
});
