import crypto from "node:crypto";
import { WebhookLog } from "../models/WebhookLog.js";
import { handleWebhookEvent, logWebhookEvent, verifyWebhookSignature } from "../services/paymentService.js";

/**
 * Razorpay webhook receiver. Mounted with express.raw (see server/index.js)
 * because the signature is an HMAC over the exact raw bytes Razorpay sent —
 * re-serializing a parsed JSON body would not round-trip byte-for-byte.
 *
 * Response-code contract with Razorpay's retry loop:
 *   - 2xx  -> delivery acknowledged, never retried
 *   - 400  -> bad signature (retrying an unauthenticated request is useless)
 *   - 5xx  -> transient processing failure, Razorpay retries with backoff
 */
export const razorpayWebhook = async (req, res, next) => {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return res.status(503).json({ message: "Webhooks are not configured on this server." });
    }

    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body;

    if (!verifyWebhookSignature(rawBody, signature)) {
      await WebhookLog.create({
        eventId: `invalid-signature-${crypto.randomUUID()}`,
        event: "unknown",
        payload: null,
        signatureValid: false,
        processingStatus: "failed",
        error: "Invalid webhook signature.",
      }).catch(() => {
        // Logging must never turn a rejected forgery into a 500.
      });
      return res.status(400).json({ message: "Invalid webhook signature." });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    const eventName = payload.event || "unknown";
    // Razorpay sends a stable per-event id header; hash the body as a
    // fallback so manual test deliveries are still deduplicated.
    const eventId =
      req.headers["x-razorpay-event-id"] || crypto.createHash("sha256").update(rawBody).digest("hex");

    const { duplicate, existing } = await logWebhookEvent({ eventId, event: eventName, payload, signatureValid: true });

    if (duplicate && existing?.processingStatus !== "failed") {
      return res.json({ status: "skipped_duplicate" });
    }
    if (duplicate) {
      // Previous attempt died mid-processing — this retry gets to run.
      await WebhookLog.updateOne({ eventId }, { processingStatus: "processing", error: "" });
    }

    try {
      const result = await handleWebhookEvent(eventName, payload);
      await WebhookLog.updateOne({ eventId }, { processingStatus: result.status, error: result.detail || "" });
      return res.json({ status: result.status });
    } catch (processingError) {
      await WebhookLog.updateOne({ eventId }, { processingStatus: "failed", error: processingError.message });
      return res.status(500).json({ message: "Webhook processing failed." });
    }
  } catch (error) {
    return next(error);
  }
};
