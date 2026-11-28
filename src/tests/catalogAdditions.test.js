import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { catalogAdditions } from "../catalogAdditions";
import { categoryMenu, products } from "../data";
import { validatePriceTiers } from "../utils/tierPricing";
import { formatLeadTime } from "../utils/leadTime";

const CATEGORIES = ["Visiting Cards", "Labels & Packaging", "Clothing & Merchandise"];

describe("catalogue additions", () => {
  it("gives each of the three categories at least 9 products, all in the header's categories", () => {
    for (const category of CATEGORIES) {
      expect(categoryMenu.some((item) => item.category === category)).toBe(true);
      const count = [...products, ...catalogAdditions].filter((p) => p.category === category).length;
      expect(count, category).toBeGreaterThanOrEqual(9);
    }
    expect(catalogAdditions.every((p) => CATEGORIES.includes(p.category))).toBe(true);
  });

  it("uses unique ids and names that don't clash with the existing catalogue", () => {
    const all = [...products, ...catalogAdditions];
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    expect(new Set(catalogAdditions.map((p) => p.name)).size).toBe(catalogAdditions.length);
  });

  it("has a mockup image on disk for every product", () => {
    for (const product of catalogAdditions) {
      const file = path.resolve("public", product.images[0].replace(/^\//, ""));
      expect(fs.existsSync(file), file).toBe(true);
    }
  });

  it("has bulk prices the admin rules accept, and readable lead times", () => {
    for (const product of catalogAdditions) {
      const { errors } = validatePriceTiers(product.priceTiers, {
        price: product.price,
        minimumOrderQty: product.minimumOrderQty,
      });
      expect(errors, product.id).toEqual([]);
      expect(formatLeadTime(product.leadTime)).toMatch(/^Ready in \d+(-\d+)? days$/);
      expect(product.description.length).toBeGreaterThan(60);
      expect(product.materials.length).toBeGreaterThanOrEqual(3);
    }
  });
});
