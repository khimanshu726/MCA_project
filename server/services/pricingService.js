import { pricingConfig } from "../config/pricing.js";
import { computePricing } from "../../src/utils/pricingCore.js";

// items: [{ price, mrp, quantity }] — already resolved against live Product
// data, with `price` the unit price charged for that quantity.
// coupon: null | an already-validated coupon record ({ type, value, maxDiscount }).
// The math lives in src/utils/pricingCore.js, shared with the browser so the
// estimate a customer sees can't drift from what the server charges.
export const computeCartPricing = (items = [], coupon = null) => computePricing(items, coupon, pricingConfig);
