import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percentage", "flat", "free_shipping"], required: true },
    value: { type: Number, default: 0, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    usageLimit: { type: Number, default: null },
    timesUsed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Coupon = mongoose.model("Coupon", couponSchema);
