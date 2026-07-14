import { pricingConfig } from "../config/pricing.js";

const round2 = (value) => Math.round(value * 100) / 100;

// items: [{ price, mrp, quantity }] — already resolved against live Product data.
// This is the single source of truth for cart-summary and order-total math,
// reused by both the cart endpoint and final order validation.
export const computeCartPricing = (items = []) => {
  const hasItems = items.length > 0;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const mrpTotal = items.reduce((sum, item) => sum + (item.mrp ?? item.price) * item.quantity, 0);
  const discount = Math.max(0, mrpTotal - subtotal);

  const platformFee = hasItems ? pricingConfig.platformFee : 0;
  const tax = round2(subtotal * pricingConfig.taxRate);
  const shipping = !hasItems || subtotal >= pricingConfig.freeShippingThreshold ? 0 : pricingConfig.shippingFee;
  const waivedShipping = hasItems && shipping === 0 ? pricingConfig.shippingFee : 0;
  const total = round2(subtotal + platformFee + tax + shipping);
  const savings = round2(discount + waivedShipping);

  return {
    subtotal: round2(subtotal),
    mrpTotal: round2(mrpTotal),
    discount: round2(discount),
    platformFee: round2(platformFee),
    tax,
    shipping: round2(shipping),
    total,
    savings,
    currency: "INR",
  };
};
