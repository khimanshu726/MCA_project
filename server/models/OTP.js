import mongoose from "mongoose";

// Keyed by EITHER mobile or email (both sparse-unique) so the same store backs
// the storefront mobile OTP and the admin email OTP. Exactly one key is set per
// record; codes are ephemeral (5-min TTL), so relaxing `mobile` from required
// to sparse needs no migration.
const otpSchema = new mongoose.Schema(
  {
    mobile: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    requestHistory: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const OTP = mongoose.model("OTP", otpSchema);
