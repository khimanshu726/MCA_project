import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { getProductById, createProductRecord, updateProductRecord } from "../services/productStore.js";

/**
 * Generic, idempotent product importer.
 *
 * Reads a normalised product dataset (an array, or an object with a `products`
 * array — the shape of data/photo-frames.json) and UPSERTS each record by its
 * stable `id`: existing rows are updated, new ones created. Safe to re-run —
 * re-importing the same file makes no duplicates. Reuses createProductRecord/
 * updateProductRecord so the schema's validation, slug assignment, and
 * price ≤ MRP rule all apply exactly as they do for the admin panel.
 *
 * A product whose `images` array is empty is SKIPPED (not an error): the model
 * requires at least one image, and this is the expected state while product
 * photos are still being supplied. Add images to the record and re-run.
 *
 * Keys the Product schema doesn't recognise (e.g. the `_variants`/`_flag`
 * provenance notes in the dataset) are ignored by create/updateProductRecord.
 */

export const readProductsFile = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const products = Array.isArray(parsed) ? parsed : parsed.products;
  if (!Array.isArray(products)) {
    throw new Error(`No products array found in ${filePath}`);
  }
  return products;
};

export const importProductRecords = async (records, { dryRun = false } = {}) => {
  const summary = { created: 0, updated: 0, skipped: 0, skippedItems: [] };

  for (const record of records) {
    if (!record?.id) {
      summary.skipped += 1;
      summary.skippedItems.push({ id: record?.id ?? "(missing id)", reason: "missing id" });
      continue;
    }

    if (!Array.isArray(record.images) || record.images.length === 0) {
      summary.skipped += 1;
      summary.skippedItems.push({ id: record.id, reason: "no images yet — pending photos" });
      continue;
    }

    const existing = await getProductById(record.id);

    if (dryRun) {
      if (existing) summary.updated += 1;
      else summary.created += 1;
      continue;
    }

    if (existing) {
      await updateProductRecord(record.id, record);
      summary.updated += 1;
    } else {
      await createProductRecord(record);
      summary.created += 1;
    }
  }

  return summary;
};

export const importProductsFromFile = async (filePath, options = {}) =>
  importProductRecords(readProductsFile(filePath), options);

const run = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileArg = args.find((arg) => arg.startsWith("--file="))?.slice("--file=".length);
  const defaultFile = path.resolve(fileURLToPath(new URL("../../data/photo-frames.json", import.meta.url)));
  const filePath = fileArg ? path.resolve(fileArg) : defaultFile;

  console.log(`[import:products] ${dryRun ? "(dry run) " : ""}Importing from ${filePath}`);

  await connectDB();
  const summary = await importProductsFromFile(filePath, { dryRun });

  console.log(`[import:products] created: ${summary.created}, updated: ${summary.updated}, skipped: ${summary.skipped}`);
  if (summary.skippedItems.length > 0) {
    for (const item of summary.skippedItems) {
      console.log(`[import:products]   skipped ${item.id} — ${item.reason}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
};

// Only run the CLI when invoked directly (node server/scripts/importProducts.js),
// never when imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error("[import:products] Failed:", error);
    process.exit(1);
  });
}
