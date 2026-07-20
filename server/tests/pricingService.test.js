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

  describe("with a coupon", () => {
    it("applies a percentage coupon, capped by maxDiscount", () => {
      const result = computeCartPricing(
        [{ price: 1000, mrp: 1000, quantity: 1 }],
        { code: "BIG", type: "percentage", value: 50, maxDiscount: 100 },
      );

      expect(result.couponCode).toBe("BIG");
      expect(result.couponDiscount).toBe(100); // 50% of 1000 = 500, capped at 100
    });

    it("applies a flat coupon, clamped to the subtotal", () => {
      const result = computeCartPricing([{ price: 30, mrp: 30, quantity: 1 }], {
        code: "FLAT100",
        type: "flat",
        value: 100,
      });

      expect(result.couponDiscount).toBe(30); // never exceeds subtotal
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("computes tax on the post-coupon subtotal, not the pre-coupon one", () => {
      const withoutCoupon = computeCartPricing([{ price: 200, mrp: 200, quantity: 1 }]);
      const withCoupon = computeCartPricing([{ price: 200, mrp: 200, quantity: 1 }], {
        code: "HALF",
        type: "percentage",
        value: 50,
      });

      expect(withCoupon.tax).toBeLessThan(withoutCoupon.tax);
      expect(withCoupon.tax).toBe(Math.round(100 * pricingConfig.taxRate * 100) / 100);
    });

    it("a free_shipping coupon waives shipping below the free-shipping threshold", () => {
      const result = computeCartPricing([{ price: 300, mrp: 300, quantity: 1 }], {
        code: "SHIP",
        type: "free_shipping",
        value: 0,
      });

      expect(result.shipping).toBe(0);
      expect(result.savings).toBe(pricingConfig.shippingFee);
    });

    it("still counts the waived shipping fee as savings when the cart already qualifies via threshold", () => {
      const price = pricingConfig.freeShippingThreshold;
      const result = computeCartPricing([{ price, mrp: price, quantity: 1 }], {
        code: "SHIP",
        type: "free_shipping",
        value: 0,
      });

      expect(result.shipping).toBe(0);
      expect(result.savings).toBe(pricingConfig.shippingFee);
    });

    it("ignores a null coupon exactly like passing none at all", () => {
      const withNull = computeCartPricing([{ price: 100, mrp: 100, quantity: 1 }], null);
      const withNone = computeCartPricing([{ price: 100, mrp: 100, quantity: 1 }]);

      expect(withNull).toEqual(withNone);
    });
  });
});
