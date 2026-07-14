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

export function computeClientCartPricing(items = []) {
  const hasItems = items.length > 0;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const mrpTotal = items.reduce((sum, item) => sum + (item.mrp ?? item.price) * item.quantity, 0);
  const discount = Math.max(0, mrpTotal - subtotal);

  const platformFee = hasItems ? PRICING_DEFAULTS.platformFee : 0;
  const tax = round2(subtotal * PRICING_DEFAULTS.taxRate);
  const shipping = !hasItems || subtotal >= PRICING_DEFAULTS.freeShippingThreshold ? 0 : PRICING_DEFAULTS.shippingFee;
  const waivedShipping = hasItems && shipping === 0 ? PRICING_DEFAULTS.shippingFee : 0;
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
}
