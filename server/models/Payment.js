import mongoose from "mongoose";

const refundHistoryEntrySchema = new mongoose.Schema(
  {
    refundId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

// One document per gateway payment attempt. An order can accumulate several
// of these (a failed UPI attempt followed by a successful card attempt), so
// payments are a separate collection rather than fields on Order — Order
// keeps only the final razorpayPaymentId snapshot it always had.
const paymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    razorpayOrderId: { type: String, required: true, index: true },
    // The gateway transaction id. Sparse because a failed attempt webhook
    // can arrive without one in edge cases; unique so the same captured
    // payment is never recorded twice (client verify + webhook race).
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    orderId: { type: String, index: true },
    customerId: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    method: { type: String, default: "" },
    status: {
      type: String,
      enum: ["created", "authorized", "captured", "failed", "refunded", "partially_refunded"],
      default: "created",
    },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    failureReason: { type: String, default: "" },
    refundId: { type: String, default: "" },
    refundStatus: { type: String, default: "" },
    refundHistory: { type: [refundHistoryEntrySchema], default: [] },
  },
  { timestamps: true },
);

export const Payment = mongoose.model("Payment", paymentSchema);
