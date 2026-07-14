import { describe, expect, it } from "vitest";
import { computeCartPricing } from "../services/pricingService.js";
import { pricingConfig } from "../config/pricing.js";

describe("computeCartPricing", () => {
  it("returns all zeros for an empty cart", () => {
    const result = computeCartPricing([]);

    expect(result).toMatchObject({
      subtotal: 0,
      discount: 0,
      platformFee: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      savings: 0,
    });
  });

  it("computes subtotal, discount, tax, platform fee and shipping below the free-shipping threshold", () => {
    const result = computeCartPricing([{ price: 100, mrp: 120, quantity: 2 }]);

    expect(result.subtotal).toBe(200);
    expect(result.mrpTotal).toBe(240);
    expect(result.discount).toBe(40);
    expect(result.platformFee).toBe(pricingConfig.platformFee);
    expect(result.tax).toBe(Math.round(200 * pricingConfig.taxRate * 100) / 100);
    expect(result.shipping).toBe(pricingConfig.shippingFee);
    expect(result.savings).toBe(40);
  });

  it("waives shipping and includes it in savings once the free-shipping threshold is met", () => {
    const price = pricingConfig.freeShippingThreshold;
    const result = computeCartPricing([{ price, mrp: price, quantity: 1 }]);

    expect(result.shipping).toBe(0);
    expect(result.savings).toBe(pricingConfig.shippingFee);
  });

  it("treats an item with no mrp as having zero discount", () => {
    const result = computeCartPricing([{ price: 50, quantity: 1 }]);

    expect(result.discount).toBe(0);
    expect(result.mrpTotal).toBe(50);
  });

  it("sums totals correctly across multiple line items", () => {
    const result = computeCartPricing([
      { price: 100, mrp: 100, quantity: 1 },
      { price: 50, mrp: 60, quantity: 3 },
    ]);

    expect(result.subtotal).toBe(250);
    expect(result.discount).toBe(30);
  });
});
