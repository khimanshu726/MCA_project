import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Product } from "../models/Product.js";
import { importProductRecords } from "../scripts/importProducts.js";

/**
 * The importer upserts by stable `id` (re-runs never duplicate), preserves the
 * Amazon `asin`, and skips imageless records rather than failing — because the
 * schema requires an image and "photos not supplied yet" is an expected state,
 * not an error.
 */
let mongoServer;

const frame = (overrides = {}) => ({
  id: "test-frame",
  name: "Test A3 Framed Artwork",
  description: "A framed artwork used in tests.",
  category: "Photo Frames",
  images: ["https://example.com/frame.jpg"],
  price: 499,
  mrp: 750,
  stock: 100,
  sku: "TF-0001",
  asin: "B0TESTASIN",
  status: "draft",
  ...overrides,
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("import-products-test"));
});

afterEach(async () => {
  await Product.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("importProductRecords", () => {
  it("creates a new product and preserves the ASIN", async () => {
    const summary = await importProductRecords([frame()]);

    expect(summary).toMatchObject({ created: 1, updated: 0, skipped: 0 });
    const saved = await Product.findOne({ id: "test-frame" });
    expect(saved.category).toBe("Photo Frames");
    expect(saved.asin).toBe("B0TESTASIN");
    expect(saved.slug).toBe("test-a3-framed-artwork");
  });

  it("is idempotent — re-running updates in place, never duplicates", async () => {
    await importProductRecords([frame()]);
    const summary = await importProductRecords([frame({ price: 450 })]);

    expect(summary).toMatchObject({ created: 0, updated: 1 });
    expect(await Product.countDocuments({ id: "test-frame" })).toBe(1);
    expect((await Product.findOne({ id: "test-frame" })).price).toBe(450);
  });

  it("skips a record with no images instead of failing", async () => {
    const summary = await importProductRecords([frame({ images: [] })]);

    expect(summary.created).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(summary.skippedItems[0]).toMatchObject({ id: "test-frame" });
    expect(await Product.countDocuments()).toBe(0);
  });

  it("dry-run reports actions without writing", async () => {
    const summary = await importProductRecords([frame()], { dryRun: true });

    expect(summary.created).toBe(1);
    expect(await Product.countDocuments()).toBe(0);
  });

  it("ignores unknown provenance keys like _variants and _flag", async () => {
    const summary = await importProductRecords([
      frame({ _variants: [{ colour: "Red", sku: "X" }], _flag: "note" }),
    ]);

    expect(summary.created).toBe(1);
    const saved = await Product.findOne({ id: "test-frame" }).lean();
    expect(saved._variants).toBeUndefined();
    expect(saved._flag).toBeUndefined();
  });
});
