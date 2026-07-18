/**
 * Client-side mirror of the server's pricingService, used only to render a
 * sticky summary for guest (not-yet-logged-in) carts before they have a
 * server cart to read from. The server (server/services/pricingService.js)
 * is always the authoritative source of truth at checkout — this exists
 * purely so guests see a realistic estimate, never to make a trust decision.
 */
const PRICING_DEFAULTS = {
  platformFee: 15,
  taxRate: 0.05,
  shippingFee: 120,
  freeShippingThreshold: 1000,
};

const round2 = (value) => Math.round(value * 100) / 100;

// Mirrors computeCouponDiscount in server/services/pricingService.js. Kept in
// step with it deliberately: the Buy Now summary recomputes totals locally on
// every quantity change, and a client/server disagreement here would show the
// customer one total and charge them another.
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
  // free_shipping coupons carry no subtotal discount — see the shipping
  // override below.

  return Math.max(0, Math.min(discount, subtotal));
};

/**
 * @param {Array<{price:number, mrp?:number, quantity:number}>} items
 * @param {object|null} coupon An already-validated coupon descriptor
 *   ({ code, type, value, maxDiscount }) as returned by POST /api/checkout/preview.
 *   Validation (active/expiry/usage/minOrderValue) is the server's job; this
 *   stays a pure function, matching the server's split.
 */
export function computeClientCartPricing(items = [], coupon = null) {
  const hasItems = items.length > 0;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const mrpTotal = items.reduce((sum, item) => sum + (item.mrp ?? item.price) * item.quantity, 0);
  const discount = Math.max(0, mrpTotal - subtotal);

  const couponDiscount = hasItems ? computeCouponDiscount(coupon, subtotal) : 0;
  const discountedSubtotal = subtotal - couponDiscount;

  const platformFee = hasItems ? PRICING_DEFAULTS.platformFee : 0;
  const tax = round2(discountedSubtotal * PRICING_DEFAULTS.taxRate);

  const isFreeShippingCoupon = hasItems && coupon?.type === "free_shipping";
  const qualifiesForFreeShippingThreshold = subtotal >= PRICING_DEFAULTS.freeShippingThreshold;
  const shipping =
    !hasItems || isFreeShippingCoupon || qualifiesForFreeShippingThreshold ? 0 : PRICING_DEFAULTS.shippingFee;
  const waivedShipping = hasItems && shipping === 0 ? PRICING_DEFAULTS.shippingFee : 0;

  const total = round2(discountedSubtotal + platformFee + tax + shipping);
  const savings = round2(discount + couponDiscount + waivedShipping);

  return {
    subtotal: round2(subtotal),
    mrpTotal: round2(mrpTotal),
    discount: round2(discount),
    couponCode: coupon?.code ?? null,
    couponDiscount: round2(couponDiscount),
    platformFee: round2(platformFee),
    tax,
    shipping: round2(shipping),
    total,
    savings,
    currency: "INR",
  };
}
