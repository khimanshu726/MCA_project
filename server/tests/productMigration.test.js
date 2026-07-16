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

/**
 * Inserts a row exactly as the OLD buggy seeder left it on production: stock
 * below its own MOQ, never touched since creation. Uses the raw driver so the
 * timestamps are ours — Mongoose would stamp `updatedAt` itself and destroy the
 * very signal under test.
 */
const insertSeededRow = async (overrides = {}) => {
  const at = new Date("2026-07-14T09:17:31.592Z");
  await Product.collection.insertOne({
    id: "legacy-flyer",
    name: "Legacy Flyer",
    slug: "legacy-flyer",
    description: "A5 flyer pack",
    category: "Marketing Materials",
    images: ["https://example.com/i.jpg"],
    price: 35,
    mrp: 35,
    stock: 100,
    minimumOrderQty: 250,
    status: "active",
    source: "data-js-seed",
    createdAt: at,
    updatedAt: at,
    ...overrides,
  });
};

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

  it("repairs a row the seeder left unsellable", async () => {
    // Production's exact state: stock 100 against MOQ 250, untouched since it
    // was written on 14 Jul.
    await insertSeededRow();

    const result = await ensureProductsSeeded();

    expect(result.seeded).toBe(false);
    expect(result.repaired).toBe(1);
    const flyer = await Product.findOne({ id: "legacy-flyer" }).lean();
    expect(flyer.stock).toBe(2500);
    expect(isProductOutOfStock(flyer)).toBe(false);
  });

  it("REFUSES to restock a row that has changed since seeding — it may be real depletion", async () => {
    // Same numbers, but this row has been modified, so its stock could be the
    // result of selling. Restocking it would invent inventory.
    await insertSeededRow({ updatedAt: new Date("2026-07-16T12:00:00.000Z") });

    const result = await ensureProductsSeeded();

    expect(result.repaired).toBe(0);
    expect(result.skipped).toBe(1);
    expect((await Product.findOne({ id: "legacy-flyer" }).lean()).stock).toBe(100);
  });

  it("is idempotent — a repaired row is not repaired again", async () => {
    await insertSeededRow();

    const first = await ensureProductsSeeded();
    const second = await ensureProductsSeeded();

    expect(first.repaired).toBe(1);
    // The repair stamps updatedAt, so the row is no longer "untouched" — and is
    // sellable anyway, so it never re-enters the candidate set.
    expect(second.repaired).toBe(0);
    expect((await Product.findOne({ id: "legacy-flyer" }).lean()).stock).toBe(2500);
  });

  it("leaves a healthy catalog alone", async () => {
    await ensureProductsSeeded();

    const result = await ensureProductsSeeded();

    expect(result.repaired).toBe(0);
  });

  it("never touches an admin-authored product", async () => {
    await ensureProductsSeeded();
    await Product.create({
      id: "admin-made",
      name: "Admin Made",
      description: "d",
      category: "Banners",
      images: ["https://example.com/i.jpg"],
      price: 10,
      mrp: 10,
      stock: 5,
      minimumOrderQty: 500,
      status: "active",
      source: "admin",
    });

    await ensureProductsSeeded();

    expect((await Product.findOne({ id: "admin-made" }).lean()).stock).toBe(5);
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
