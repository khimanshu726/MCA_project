import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    requestHistory: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const OTP = mongoose.model("OTP", otpSchema);
