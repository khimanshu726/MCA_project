import { pricingConfig } from "../config/pricing.js";

const round2 = (value) => Math.round(value * 100) / 100;

const computeCouponDiscount = (coupon, subtotal) => {
  if (!coupon) return 0;

  let discount = 0;

  if (coupon.type === "percentage") {
    discount = subtotal * (coupon.value / 100);
    if (coupon.maxDiscount != null) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else if (coupon.type === "flat") {
    discount = coupon.value;
  }
  // free_shipping coupons carry no subtotal discount — see the shipping override below.

  return Math.max(0, Math.min(discount, subtotal));
};

// items: [{ price, mrp, quantity }] — already resolved against live Product data.
// coupon: null | an already-validated coupon record ({ type, value, maxDiscount }).
// Validation (active/expiry/usage/minOrderValue) happens in the caller —
// this stays a pure function, consistent with how stock validation happens
// before this is ever called.
export const computeCartPricing = (items = [], coupon = null) => {
  const hasItems = items.length > 0;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const mrpTotal = items.reduce((sum, item) => sum + (item.mrp ?? item.price) * item.quantity, 0);
  const productDiscount = Math.max(0, mrpTotal - subtotal);

  const couponDiscount = hasItems ? computeCouponDiscount(coupon, subtotal) : 0;
  const discountedSubtotal = subtotal - couponDiscount;

  const platformFee = hasItems ? pricingConfig.platformFee : 0;
  const tax = round2(discountedSubtotal * pricingConfig.taxRate);

  const isFreeShippingCoupon = hasItems && coupon?.type === "free_shipping";
  const qualifiesForFreeShippingThreshold = subtotal >= pricingConfig.freeShippingThreshold;
  const shipping = !hasItems || isFreeShippingCoupon || qualifiesForFreeShippingThreshold ? 0 : pricingConfig.shippingFee;
  // Free shipping is worth the same to the customer regardless of *why*
  // it's free (threshold or coupon) — no double-counting concern, it's a
  // single waived fee either way.
  const waivedShipping = hasItems && shipping === 0 ? pricingConfig.shippingFee : 0;

  const total = round2(discountedSubtotal + platformFee + tax + shipping);
  const savings = round2(productDiscount + couponDiscount + waivedShipping);

  return {
    subtotal: round2(subtotal),
    mrpTotal: round2(mrpTotal),
    discount: round2(productDiscount),
    couponCode: coupon?.code ?? null,
    couponDiscount: round2(couponDiscount),
    platformFee: round2(platformFee),
    tax,
    shipping: round2(shipping),
    total,
    savings,
    currency: "INR",
  };
};
