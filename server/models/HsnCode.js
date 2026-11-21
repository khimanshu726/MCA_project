import mongoose from "mongoose";
import { GST_RATES } from "../../src/utils/gst.js";

/**
 * One HSN (goods) or SAC (services) code and its GST rate. Products point at a
 * row by `code`; the rate is always read from here, never stored per product,
 * so a rate change is one edit that every product using the code follows.
 *
 * `confirmed` is the owner's (or accountant's) sign-off that the rate is right
 * for how the shop supplies the item. GST is only charged on confirmed rows.
 * Editing the rate clears it, so a changed rate is always re-confirmed.
 */
const rateValidator = {
  validator: (value) => value == null || GST_RATES.includes(Number(value)),
  message: `GST rate must be one of ${GST_RATES.join(", ")}%.`,
};

const hsnCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, match: [/^\d{4,8}$/, "Code must be 4 to 8 digits."] },
    kind: { type: String, enum: ["HSN", "SAC"], default: "HSN" },
    description: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, validate: rateValidator },
    // Value-based rate: above `priceThreshold` (₹ per piece) the rate is
    // `rateAboveThreshold` instead. Both null for a flat-rate code.
    priceThreshold: { type: Number, default: null, min: 0 },
    rateAboveThreshold: { type: Number, default: null, validate: rateValidator },
    // What the row is used for. Exactly one row may cover shipping, and one the
    // platform fee; product rows are picked per product.
    appliesTo: { type: String, enum: ["product", "shipping", "platformFee"], default: "product" },
    confirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

hsnCodeSchema.pre("validate", function checkThreshold() {
  const hasThreshold = this.priceThreshold != null;
  const hasAboveRate = this.rateAboveThreshold != null;
  if (hasThreshold !== hasAboveRate) {
    this.invalidate("priceThreshold", "Set both the price limit and the rate above it, or neither.");
  }
});

export const HsnCode = mongoose.model("HsnCode", hsnCodeSchema);
