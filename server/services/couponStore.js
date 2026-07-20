import { Coupon } from "../models/Coupon.js";

export const findCouponByCode = async (code) => {
  if (!code) return null;
  return Coupon.findOne({ code: String(code).trim().toUpperCase() });
};

// Pure validation against the coupon's own rules and the cart's current
// subtotal — no DB writes here, so it's safe to call on every cart read.
export const validateCoupon = (coupon, subtotal) => {
  if (!coupon) {
    return { valid: false, reason: "Coupon code not found." };
  }

  if (!coupon.isActive) {
    return { valid: false, reason: "This coupon is no longer active." };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: "This coupon has expired." };
  }

  if (coupon.usageLimit != null && coupon.timesUsed >= coupon.usageLimit) {
    return { valid: false, reason: "This coupon has reached its usage limit." };
  }

  if (subtotal < coupon.minOrderValue) {
    return {
      valid: false,
      reason: `Add ${coupon.minOrderValue - subtotal > 0 ? "more items" : "items"} — this coupon requires a minimum order of ₹${coupon.minOrderValue}.`,
    };
  }

  return { valid: true, reason: "" };
};

// Atomic, race-safe usage increment — same pattern as decrementStockAtomic:
// the usageLimit filter is evaluated by MongoDB at the document level, so
// two concurrent orders using the last remaining use can't both succeed.
export const incrementCouponUsage = async (code) => {
  const filter = { code: String(code).trim().toUpperCase(), isActive: true };
  const coupon = await Coupon.findOne(filter);

  if (!coupon) return null;

  if (coupon.usageLimit != null) {
    filter.timesUsed = { $lt: coupon.usageLimit };
  }

  return Coupon.findOneAndUpdate(filter, { $inc: { timesUsed: 1 } }, { new: true });
};

export const createCoupon = async (payload) => {
  const coupon = new Coupon(payload);
  await coupon.save();
  return coupon;
};
