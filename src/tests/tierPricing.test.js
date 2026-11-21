import { describe, expect, it } from "vitest";
import { getNextTier, getUnitPrice, validatePriceTiers, MAX_PRICE_TIERS } from "../utils/tierPricing";
import { computeClientCartPricing } from "../utils/pricing";
import { computeCartPricing } from "../../server/services/pricingService.js";

const card = {
  price: 18,
  mrp: 20,
  minimumOrderQty: 100,
  // Deliberately out of order: callers must not depend on stored order.
  priceTiers: [
    { minQty: 500, price: 14 },
    { minQty: 250, price: 16 },
  ],
};

describe("getUnitPrice", () => {
  it.each([
    [100, 18],
    [249, 18],
    [250, 16],
    [499, 16],
    [500, 14],
    [5000, 14],
  ])("%i units cost ₹%i each", (qty, expected) => {
    expect(getUnitPrice(card, qty)).toBe(expected);
  });

  it("uses the base price for a product without tiers", () => {
    expect(getUnitPrice({ price: 9 }, 1000)).toBe(9);
    expect(getUnitPrice({ price: 9, priceTiers: [] }, 1000)).toBe(9);
  });
});

describe("getNextTier", () => {
  it("points to the next cheaper break", () => {
    expect(getNextTier(card, 100)).toEqual({ minQty: 250, price: 16 });
    expect(getNextTier(card, 250)).toEqual({ minQty: 500, price: 14 });
  });

  it("is null at the best price or without tiers", () => {
    expect(getNextTier(card, 500)).toBeNull();
    expect(getNextTier({ price: 9 }, 1)).toBeNull();
  });
});

describe("validatePriceTiers", () => {
  const context = { price: 18, minimumOrderQty: 100 };

  it("accepts valid tiers and returns them sorted by quantity", () => {
    const { tiers, errors } = validatePriceTiers(card.priceTiers, context);
    expect(errors).toEqual([]);
    expect(tiers.map((tier) => tier.minQty)).toEqual([250, 500]);
  });

  it.each([
    ["a quantity at or below the minimum order", [{ minQty: 100, price: 16 }], /more than the minimum order/],
    ["a non-whole quantity", [{ minQty: 250.5, price: 16 }], /whole number/],
    ["a price at or above the base price", [{ minQty: 250, price: 18 }], /lower than the base price/],
    ["a zero price", [{ minQty: 250, price: 0 }], /more than ₹0/],
    ["duplicate quantities", [{ minQty: 250, price: 16 }, { minQty: 250, price: 15 }], /different quantity/],
    ["a price that rises with quantity", [{ minQty: 250, price: 15 }, { minQty: 500, price: 16 }], /can't cost more per unit/],
  ])("rejects %s", (_label, tiers, message) => {
    const { errors } = validatePriceTiers(tiers, context);
    expect(errors.join(" ")).toMatch(message);
  });

  it(`allows at most ${MAX_PRICE_TIERS} rows`, () => {
    const tooMany = Array.from({ length: MAX_PRICE_TIERS + 1 }, (_, i) => ({ minQty: 200 + i * 100, price: 17 - i * 0.5 }));
    expect(validatePriceTiers(tooMany, context).errors.join(" ")).toMatch(/at most/);
  });

  it("treats no tiers as valid", () => {
    expect(validatePriceTiers(undefined, context)).toEqual({ tiers: [], errors: [] });
    expect(validatePriceTiers([], context)).toEqual({ tiers: [], errors: [] });
  });
});

// The browser estimate and the server charge run the same math, but each has
// its own config. With the defaults in place they must agree exactly.
describe("browser and server pricing agree", () => {
  it.each([
    [[{ price: getUnitPrice(card, 250), mrp: 20, quantity: 250 }], null],
    [[{ price: 9, mrp: 9, quantity: 6 }, { price: 14, mrp: 20, quantity: 500 }], { code: "SAVE10", type: "percentage", value: 10, maxDiscount: 200 }],
    [[{ price: 79, mrp: 99, quantity: 1 }], { code: "FREESHIP", type: "free_shipping", value: 0 }],
  ])("for %j", (items, coupon) => {
    expect(computeClientCartPricing(items, coupon)).toEqual(computeCartPricing(items, coupon));
  });
});
