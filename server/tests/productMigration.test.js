import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Product } from "../models/Product.js";
import { ensureProductsSeeded, migrateLegacyProducts } from "../services/productMigration.js";
import { isProductOutOfStock } from "../../src/utils/productAvailability.js";

/**
 * Seeding must never mint a product that can't be bought, and re-running the
 * migration must never reset stock that real orders have depleted.
 *
 * `launch-flyer` violated the first: stock defaulted to a flat 100 for every
 * product while MOQ was parsed independently out of a string ("MOQ 250" ->
 * 250). It was unsellable from birth — addable to the cart, then priced at
 * zero with checkout blocked.
 *
 * Note the two entry points differ: ensureProductsSeeded() only acts on an
 * empty collection (so a real catalog is never overwritten at boot), while
 * migrateLegacyProducts() is the explicit re-run behind `npm run
 * migrate:products`. The preservation guarantees below are asserted against
 * the latter, because that's the one that actually touches existing rows.
 */
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("product-migration-test"));
});

afterEach(async () => {
  await Product.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("product seeding", () => {
  it("never seeds a product whose stock can't satisfy its own MOQ", async () => {
    await ensureProductsSeeded();

    const products = await Product.find({ source: "data-js-seed" }).lean();
    expect(products.length).toBeGreaterThan(0);

    const unsellable = products
      .filter((p) => isProductOutOfStock(p))
      .map((p) => `${p.id} (stock ${p.stock} < MOQ ${p.minimumOrderQty})`);
    expect(unsellable).toEqual([]);
  });

  it("gives the 250-MOQ flyer enough stock to actually sell", async () => {
    await ensureProductsSeeded();

    const flyer = await Product.findOne({ id: "launch-flyer" }).lean();
    expect(flyer.minimumOrderQty).toBe(250);
    expect(flyer.stock).toBeGreaterThanOrEqual(250);
    expect(isProductOutOfStock(flyer)).toBe(false);
  });

  it("leaves an existing catalog untouched at boot", async () => {
    await Product.create({
      id: "admin-authored",
      name: "Admin Authored",
      description: "d",
      category: "Banners",
      images: ["https://example.com/i.jpg"],
      price: 10,
      mrp: 10,
      stock: 7,
      status: "active",
    });

    const result = await ensureProductsSeeded();

    expect(result.seeded).toBe(false);
    expect(await Product.countDocuments()).toBe(1);
  });
});

describe("migrateLegacyProducts re-run", () => {
  it("preserves stock — a re-run is not an inventory reset", async () => {
    await migrateLegacyProducts();
    await Product.updateOne({ id: "classic-card" }, { stock: 500 });

    await migrateLegacyProducts();

    expect((await Product.findOne({ id: "classic-card" }).lean()).stock).toBe(500);
  });

  it("leaves a genuinely sold-out product at zero rather than restocking it", async () => {
    await migrateLegacyProducts();
    await Product.updateOne({ id: "classic-card" }, { stock: 0 });

    await migrateLegacyProducts();

    expect((await Product.findOne({ id: "classic-card" }).lean()).stock).toBe(0);
  });

  it("does not restock a product that has genuinely sold down below its MOQ", async () => {
    await migrateLegacyProducts();
    // Reachable by ordinary selling: stock 300 against MOQ 250, one order of
    // 250, and 50 is left. It reads identically to the old seeding bug, so the
    // migration must not "repair" it — that would refill real inventory.
    await Product.updateOne({ id: "launch-flyer" }, { stock: 50 });

    await migrateLegacyProducts();

    expect((await Product.findOne({ id: "launch-flyer" }).lean()).stock).toBe(50);
  });
});
