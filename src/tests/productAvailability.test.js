import { describe, expect, it } from "vitest";
import {
  getDefaultOrderQty,
  getMinimumOrderQty,
  getQuantityStep,
  isProductLowStock,
  isProductOutOfStock,
  snapQuantity,
} from "../utils/productAvailability.js";

describe("quantity steps", () => {
  it("reads a product's step, defaulting to 1", () => {
    expect(getQuantityStep({ quantityStep: 50 })).toBe(50);
    expect(getQuantityStep({})).toBe(1);
    expect(getQuantityStep({ quantityStep: 0 })).toBe(1);
    expect(getQuantityStep({ quantityStep: 2.5 })).toBe(1);
  });

  it("puts quantities on the grid from the minimum: 100, 150, 200…", () => {
    const grid = { min: 100, max: 1000, step: 50 };
    expect(snapQuantity(170, grid)).toBe(150);
    expect(snapQuantity(180, grid)).toBe(200);
    expect(snapQuantity(101, grid, "up")).toBe(150);
    expect(snapQuantity(199, grid, "down")).toBe(150);
    expect(snapQuantity(40, grid)).toBe(100);
    expect(snapQuantity(5000, grid)).toBe(1000);
  });

  it("never goes past stock, stopping at the last allowed quantity", () => {
    expect(snapQuantity(5000, { min: 100, max: 420, step: 50 })).toBe(400);
    expect(snapQuantity(420, { min: 100, max: 420, step: 50 }, "up")).toBe(400);
  });

  it("is a plain clamp with a step of 1", () => {
    expect(snapQuantity(137, { min: 100, max: 1000 })).toBe(137);
    expect(snapQuantity("", { min: 100, max: 1000 })).toBe(100);
  });
});

/**
 * The bug this module exists to prevent: `launch-flyer` shipped with stock 100
 * against a minimum order quantity of 250. The product page offered an enabled
 * "Add to cart", the badge went to 250, and the cart — which used a stricter
 * rule than the button did — called it out of stock, excluded it from pricing,
 * and showed "0 items / ₹0" with checkout blocked.
 */
describe("productAvailability", () => {
  const product = (overrides) => ({ id: "p", stock: 100, minimumOrderQty: 1, ...overrides });

  describe("isProductOutOfStock", () => {
    it("treats stock below the product's own MOQ as out of stock", () => {
      // The exact launch-flyer regression.
      expect(isProductOutOfStock(product({ stock: 100, minimumOrderQty: 250 }))).toBe(true);
    });

    it("sells when stock exactly meets the MOQ", () => {
      expect(isProductOutOfStock(product({ stock: 100, minimumOrderQty: 100 }))).toBe(false);
    });

    it("treats zero and negative stock as out of stock", () => {
      expect(isProductOutOfStock(product({ stock: 0 }))).toBe(true);
      expect(isProductOutOfStock(product({ stock: -5 }))).toBe(true);
    });

    it("treats a missing product as out of stock rather than buyable", () => {
      expect(isProductOutOfStock(null)).toBe(true);
      expect(isProductOutOfStock(undefined)).toBe(true);
    });

    it("does not let a missing or junk stock value read as in stock", () => {
      expect(isProductOutOfStock({ id: "p" })).toBe(true);
      expect(isProductOutOfStock({ id: "p", stock: "lots" })).toBe(true);
    });

    it("defaults a missing MOQ to 1 rather than blocking the sale", () => {
      expect(isProductOutOfStock({ id: "p", stock: 1 })).toBe(false);
    });
  });

  describe("getMinimumOrderQty", () => {
    it("defaults to 1 for missing, zero, or invalid values", () => {
      expect(getMinimumOrderQty({})).toBe(1);
      expect(getMinimumOrderQty({ minimumOrderQty: 0 })).toBe(1);
      expect(getMinimumOrderQty({ minimumOrderQty: -10 })).toBe(1);
      expect(getMinimumOrderQty(null)).toBe(1);
    });

    it("honours a real print-run minimum", () => {
      expect(getMinimumOrderQty({ minimumOrderQty: 250 })).toBe(250);
    });
  });

  describe("isProductLowStock", () => {
    it("warns near the end of stock", () => {
      expect(isProductLowStock(product({ stock: 4 }))).toBe(true);
    });

    it("is never true for something already unbuyable", () => {
      expect(isProductLowStock(product({ stock: 0 }))).toBe(false);
      expect(isProductLowStock(product({ stock: 100, minimumOrderQty: 250 }))).toBe(false);
    });
  });

  describe("getDefaultOrderQty", () => {
    it("adds a full print run when stock allows", () => {
      expect(getDefaultOrderQty(product({ stock: 1000, minimumOrderQty: 250 }))).toBe(250);
    });

    it("never proposes more than what's on hand", () => {
      expect(getDefaultOrderQty(product({ stock: 3, minimumOrderQty: 250 }))).toBe(3);
    });
  });
});
