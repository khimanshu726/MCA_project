import crypto from "node:crypto";
import { Payment } from "../models/Payment.js";
import { WebhookLog } from "../models/WebhookLog.js";
import { updateOrderRecord, getOrderById } from "./orderStore.js";
import { notifyOrderConfirmed, sendPaymentFailed } from "./email/resendService.js";
import razorpayInstance from "../config/razorpay.js";

const timingSafeHexEqual = (expected, received) => {
  const expectedBuffer = Buffer.from(expected, "hex");
  let receivedBuffer;
  try {
    receivedBuffer = Buffer.from(received, "hex");
  } catch {
    return false;
  }
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

/**
 * Verifies the checkout-callback signature Razorpay hands to the browser:
 * HMAC-SHA256(`${order_id}|${payment_id}`) keyed with the API key secret.
 * This is the only proof a payment succeeded that the frontend is allowed
 * to relay — the payload itself is never trusted.
 */
export const verifyPaymentSignature = ({ razorpayOrderId, razorpayPaymentId, signature }) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !razorpayOrderId || !razorpayPaymentId || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  return timingSafeHexEqual(expected, signature);
};

/**
 * Verifies a webhook delivery: HMAC-SHA256 over the *raw* request body,
 * keyed with the dedicated webhook secret (a separate credential from the
 * API key secret, configured on the Razorpay dashboard).
 */
export const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawBody || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeHexEqual(expected, signature);
};

const findOrCreatePayment = async ({ razorpayOrderId, razorpayPaymentId, order, defaults }) => {
  if (razorpayPaymentId) {
    const existing = await Payment.findOne({ razorpayPaymentId });
    if (existing) return { payment: existing, created: false };
  }

  try {
    const payment = await Payment.create({
      id: crypto.randomUUID(),
      razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId || undefined,
      orderId: order?.orderId || "",
      customerId: order?.customerId || null,
      amount: order?.price ?? 0,
      currency: "INR",
      ...defaults,
    });
    return { payment, created: true };
  } catch (error) {
    // Unique-index race: the webhook and the client verify call can both
    // try to record the same captured payment — whichever loses refetches.
    if (error?.code === 11000 && razorpayPaymentId) {
      const payment = await Payment.findOne({ razorpayPaymentId });
      if (payment) return { payment, created: false };
    }
    throw error;
  }
};

/**
 * Idempotently marks a payment captured: records the Payment document and
 * transitions the local order out of PaymentPending into Placed/Paid with a
 * status-history entry. Safe to call from both the client verify endpoint
 * and the payment.captured webhook — whichever arrives second is a no-op.
 */
export const recordPaymentCaptured = async ({ razorpayOrderId, razorpayPaymentId, method = "", gatewayResponse = null }) => {
  const order = await getOrderById(razorpayOrderId);
  if (!order) return { order: null, payment: null };

  const { payment, created } = await findOrCreatePayment({
    razorpayOrderId,
    razorpayPaymentId,
    order,
    defaults: { status: "captured", method, gatewayResponse },
  });

  if (!created && payment.status !== "captured") {
    payment.status = "captured";
    if (method) payment.method = method;
    if (gatewayResponse) payment.gatewayResponse = gatewayResponse;
    await payment.save();
  }

  // Captured before the update: this is the transition that turns a pending
  // online order into a confirmed one, which is exactly when the customer is
  // owed their confirmation email.
  const wasPendingPayment = order.orderStatus === "PaymentPending";

  const updatedOrder = await updateOrderRecord(razorpayOrderId, (currentOrder) => {
    if (currentOrder.paymentStatus === "Paid") return currentOrder;

    const isPendingPayment = currentOrder.orderStatus === "PaymentPending";
    return {
      ...currentOrder,
      paymentStatus: "Paid",
      razorpayPaymentId,
      orderStatus: isPendingPayment ? "Placed" : currentOrder.orderStatus,
      statusHistory: isPendingPayment
        ? [
            ...(currentOrder.statusHistory || []),
            { status: "Placed", changedAt: new Date().toISOString(), note: "Payment captured." },
          ]
        : currentOrder.statusHistory,
      updatedAt: new Date().toISOString(),
    };
  });

  // Payment succeeded → send the confirmation. This path runs from both the
  // client verify endpoint and the payment.captured webhook; notifyOrderConfirmed
  // claims the send atomically, so only one of them actually dispatches.
  // Fire-and-forget: a slow or failing mailer must not delay recording the
  // capture (which is what keeps the gateway's retry loop satisfied).
  if (updatedOrder && wasPendingPayment) {
    notifyOrderConfirmed(updatedOrder).catch((error) => {
      console.error(`Order confirmation email failed for ${updatedOrder.orderId}:`, error);
    });
  }

  return { order: updatedOrder, payment };
};

/**
 * Records a failed attempt. The order deliberately STAYS in PaymentPending —
 * a declined card is not an abandoned checkout, and the customer can retry
 * against the same Razorpay order. Reserved stock is only released by the
 * explicit cancel-payment endpoint (or a later successful capture).
 */
export const recordPaymentFailed = async ({ razorpayOrderId, razorpayPaymentId, reason = "", gatewayResponse = null }) => {
  const order = await getOrderById(razorpayOrderId);

  const { payment, created } = await findOrCreatePayment({
    razorpayOrderId,
    razorpayPaymentId,
    order,
    defaults: { status: "failed", failureReason: reason, gatewayResponse },
  });

  // Never let a stale failed webhook downgrade an already-captured payment.
  if (!created && payment.status !== "captured" && payment.status !== "failed") {
    payment.status = "failed";
    payment.failureReason = reason;
    await payment.save();
  }

  // Email the customer once, only on the FIRST failure record for this payment
  // (`created`), so Razorpay's webhook retries don't send duplicates. Best-
  // effort — never affects the webhook/verify response.
  if (created && order?.email) {
    sendPaymentFailed(order, { reason }).catch((error) => {
      console.error(`[email] payment-failed email failed for ${order.orderId}:`, error);
    });
  }

  return { order, payment };
};

/** Applies a refund.processed webhook to the Payment + Order records. */
export const applyRefundProcessed = async ({ razorpayPaymentId, refundId, amount, status = "processed", notes = "" }) => {
  const payment = await Payment.findOne({ razorpayPaymentId });
  if (!payment) return { payment: null, order: null };

  const alreadyRecorded = payment.refundHistory.some((entry) => entry.refundId === refundId);
  if (!alreadyRecorded) {
    payment.refundHistory.push({ refundId, amount, status, notes, processedAt: new Date() });
  }
  payment.refundId = refundId;
  payment.refundStatus = status;

  const refundedTotal = payment.refundHistory.reduce((sum, entry) => sum + entry.amount, 0);
  payment.status = refundedTotal >= payment.amount ? "refunded" : "partially_refunded";
  await payment.save();

  const order = payment.status === "refunded"
    ? await updateOrderRecord(payment.razorpayOrderId, (currentOrder) => ({
        ...currentOrder,
        paymentStatus: "Refunded",
        orderStatus: "Refunded",
        statusHistory: (currentOrder.statusHistory || []).some((entry) => entry.status === "Refunded")
          ? currentOrder.statusHistory
          : [
              ...(currentOrder.statusHistory || []),
              { status: "Refunded", changedAt: new Date().toISOString(), note: "Refund processed by gateway." },
            ],
        updatedAt: new Date().toISOString(),
      }))
    : await getOrderById(payment.razorpayOrderId);

  return { payment, order };
};

/**
 * Refund interface for future admin tooling. Initiates the refund at the
 * gateway; the authoritative state change lands via the refund.processed
 * webhook (applyRefundProcessed), so this only kicks the process off.
 */
export const initiateRefund = async ({ razorpayPaymentId, amountInRupees, notes = {} }) => {
  if (!razorpayInstance) {
    throw new Error("Refunds are not available: Razorpay is not configured on this server.");
  }

  const payment = await Payment.findOne({ razorpayPaymentId, status: "captured" });
  if (!payment) {
    throw new Error("No captured payment found for this transaction.");
  }

  const refund = await razorpayInstance.payments.refund(razorpayPaymentId, {
    ...(amountInRupees ? { amount: Math.round(amountInRupees * 100) } : {}),
    notes,
  });

  payment.refundId = refund.id;
  payment.refundStatus = refund.status || "pending";
  await payment.save();

  return refund;
};

/**
 * Dispatches a verified webhook event. Assumes the signature has already
 * been checked and the event logged; returns how the event was handled so
 * the controller can finalize the WebhookLog entry.
 */
export const handleWebhookEvent = async (eventName, payload) => {
  const paymentEntity = payload?.payload?.payment?.entity;
  const refundEntity = payload?.payload?.refund?.entity;

  switch (eventName) {
    case "payment.captured":
    case "order.paid": {
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;
      if (!razorpayOrderId || !razorpayPaymentId) return { status: "ignored", detail: "Missing payment entity." };

      await recordPaymentCaptured({
        razorpayOrderId,
        razorpayPaymentId,
        method: paymentEntity.method || "",
        gatewayResponse: paymentEntity,
      });
      return { status: "processed" };
    }
    case "payment.failed": {
      const razorpayOrderId = paymentEntity?.order_id;
      if (!razorpayOrderId) return { status: "ignored", detail: "Missing payment entity." };

      await recordPaymentFailed({
        razorpayOrderId,
        razorpayPaymentId: paymentEntity.id,
        reason: paymentEntity.error_description || paymentEntity.error_code || "Payment failed.",
        gatewayResponse: paymentEntity,
      });
      return { status: "processed" };
    }
    case "refund.processed": {
      if (!refundEntity?.payment_id) return { status: "ignored", detail: "Missing refund entity." };

      await applyRefundProcessed({
        razorpayPaymentId: refundEntity.payment_id,
        refundId: refundEntity.id,
        amount: (refundEntity.amount || 0) / 100,
        status: refundEntity.status || "processed",
      });
      return { status: "processed" };
    }
    default:
      return { status: "ignored", detail: `Unhandled event: ${eventName}` };
  }
};

export const logWebhookEvent = async ({ eventId, event, payload, signatureValid }) => {
  try {
    const log = await WebhookLog.create({ eventId, event, payload, signatureValid, processingStatus: "processing" });
    return { log, duplicate: false, existing: null };
  } catch (error) {
    if (error?.code === 11000) {
      // Duplicate delivery. The caller decides whether to skip (already
      // processed) or reprocess (previous attempt failed mid-flight).
      const existing = await WebhookLog.findOne({ eventId });
      return { log: null, duplicate: true, existing };
    }
    throw error;
  }
};
