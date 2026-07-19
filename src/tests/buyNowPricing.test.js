import { describe, it, expect } from "vitest";
import { computeClientCartPricing } from "../utils/pricing";
import { computeCartPricing } from "../../server/services/pricingService.js";

/**
 * The Buy Now summary recomputes totals in the browser on every quantity
 * change, while the order endpoint recomputes them on the server at placement.
 * If those two ever disagree the customer is shown one number and charged
 * another, so these tests assert the two implementations agree exactly rather
 * than asserting hand-written expected values.
 */
describe("client/server pricing agreement", () => {
  const cases = [
    { name: "single item below the free-shipping threshold", items: [{ price: 79, mrp: 99, quantity: 5 }] },
    { name: "single item above the free-shipping threshold", items: [{ price: 500, mrp: 500, quantity: 4 }] },
    { name: "exactly at the free-shipping threshold", items: [{ price: 1000, mrp: 1000, quantity: 1 }] },
    { name: "large print run", items: [{ price: 12.5, mrp: 20, quantity: 250 }] },
  ];

  const coupons = [
    { name: "no coupon", coupon: null },
    { name: "percentage", coupon: { code: "SAVE10", type: "percentage", value: 10, maxDiscount: null } },
    { name: "percentage capped", coupon: { code: "CAP", type: "percentage", value: 50, maxDiscount: 100 } },
    { name: "flat", coupon: { code: "FLAT50", type: "flat", value: 50, maxDiscount: null } },
    { name: "free shipping", coupon: { code: "FREESHIP", type: "free_shipping", value: 0, maxDiscount: null } },
  ];

  for (const { name: itemName, items } of cases) {
    for (const { name: couponName, coupon } of coupons) {
      it(`agrees for ${itemName} with ${couponName}`, () => {
        expect(computeClientCartPricing(items, coupon)).toEqual(computeCartPricing(items, coupon));
      });
    }
  }

  it("never discounts below zero, on either side", () => {
    const items = [{ price: 10, mrp: 10, quantity: 1 }];
    const coupon = { code: "HUGE", type: "flat", value: 9999, maxDiscount: null };

    const client = computeClientCartPricing(items, coupon);
    expect(client).toEqual(computeCartPricing(items, coupon));
    expect(client.couponDiscount).toBe(10);
    expect(client.total).toBeGreaterThanOrEqual(0);
  });

  it("charges no fees at all for an empty basket", () => {
    const client = computeClientCartPricing([], { code: "X", type: "flat", value: 50 });
    expect(client).toEqual(computeCartPricing([], { code: "X", type: "flat", value: 50 }));
    expect(client.total).toBe(0);
    expect(client.platformFee).toBe(0);
    expect(client.shipping).toBe(0);
  });

  it("keeps the pre-existing no-coupon call signature working", () => {
    // useCart calls this with one argument for the guest cart estimate.
    expect(computeClientCartPricing([{ price: 100, mrp: 100, quantity: 2 }])).toEqual(
      computeClientCartPricing([{ price: 100, mrp: 100, quantity: 2 }], null),
    );
  });
});
