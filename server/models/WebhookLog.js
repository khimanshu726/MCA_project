import mongoose from "mongoose";

// Every inbound gateway webhook is logged here before it is acted on. The
// unique eventId is what makes webhook processing idempotent: Razorpay
// retries deliveries until it sees a 2xx, so the same event can legitimately
// arrive more than once — the second insert fails the unique index and the
// handler acknowledges without reprocessing.
const webhookLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    event: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    signatureValid: { type: Boolean, required: true },
    processingStatus: {
      type: String,
      enum: ["processing", "processed", "skipped_duplicate", "ignored", "failed"],
      default: "processing",
    },
    error: { type: String, default: "" },
  },
  { timestamps: true },
);

export const WebhookLog = mongoose.model("WebhookLog", webhookLogSchema);
