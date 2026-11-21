/**
 * Browser-side pricing for guest carts and the Buy Now summary, rendered before
 * the server has priced anything. The server (server/services/pricingService.js)
 * is always the authoritative source at checkout — this only lets the customer
 * see a realistic total, never makes a trust decision.
 *
 * Both sides run the same math (src/utils/pricingCore.js); only the config
 * differs in where it comes from. These defaults must match the server's
 * defaults in server/config/pricing.js.
 */
import { computePricing } from "./pricingCore";

const PRICING_DEFAULTS = {
  platformFee: 15,
  taxRate: 0.05,
  shippingFee: 120,
  freeShippingThreshold: 1000,
};

/**
 * @param {Array<{price:number, mrp?:number, quantity:number}>} items
 * @param {object|null} coupon An already-validated coupon descriptor
 *   ({ code, type, value, maxDiscount }) as returned by POST /api/checkout/preview.
 */
export function computeClientCartPricing(items = [], coupon = null) {
  return computePricing(items, coupon, PRICING_DEFAULTS);
}
