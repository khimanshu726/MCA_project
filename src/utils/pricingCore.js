/**
 * The one definition of how an order is priced.
 *
 * This math used to be written twice — server/services/pricingService.js
 * (authoritative, at checkout) and src/utils/pricing.js (a browser copy for
 * guest carts and Buy Now) — kept "in step" by hand. Two copies of money math
 * is how a customer gets shown one total and charged another, so both now call
 * this module. It's imported by the browser AND the Node server (server/
 * already imports from src/, see productAvailability.js), so it must stay pure:
 * no env, no browser or React globals. Each caller passes its own `config`.
 *
 * @typedef {{ platformFee:number, taxRate:number, shippingFee:number, freeShippingThreshold:number }} PricingConfig
 */

export const round2 = (value) => Math.round(value * 100) / 100;

export const computeCouponDiscount = (coupon, subtotal) => {
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

/**
 * @param {Array<{price:number, mrp?:number, quantity:number}>} items Already
 *   resolved against live product data; `price` is the unit price actually
 *   charged for that quantity (see tierPricing.getUnitPrice).
 * @param {object|null} coupon An already-validated coupon ({ code, type, value, maxDiscount }).
 *   Validation (active/expiry/usage/minOrderValue) is the caller's job.
 * @param {PricingConfig} config
 */
export const computePricing = (items = [], coupon = null, config) => {
  const hasItems = items.length > 0;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const mrpTotal = items.reduce((sum, item) => sum + (item.mrp ?? item.price) * item.quantity, 0);
  const productDiscount = Math.max(0, mrpTotal - subtotal);

  const couponDiscount = hasItems ? computeCouponDiscount(coupon, subtotal) : 0;
  const discountedSubtotal = subtotal - couponDiscount;

  const platformFee = hasItems ? config.platformFee : 0;
  const tax = round2(discountedSubtotal * config.taxRate);

  const isFreeShippingCoupon = hasItems && coupon?.type === "free_shipping";
  const qualifiesForFreeShippingThreshold = subtotal >= config.freeShippingThreshold;
  const shipping = !hasItems || isFreeShippingCoupon || qualifiesForFreeShippingThreshold ? 0 : config.shippingFee;
  // Free shipping is worth the same to the customer regardless of *why* it's
  // free (threshold or coupon) — a single waived fee either way.
  const waivedShipping = hasItems && shipping === 0 ? config.shippingFee : 0;

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
