import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Product } from "../models/Product.js";
import { getMinimumOrderQty } from "../../src/utils/productAvailability.js";

/**
 * Reports — and optionally repairs — products stranded below their own minimum
 * order quantity.
 *
 * A product with 0 < stock < minimumOrderQty cannot be bought by anyone: the
 * cart refuses it, and no customer can order fewer than the minimum to work it
 * down. `launch-flyer` shipped in exactly that state (stock 100, MOQ 250)
 * because seed stock defaulted to a flat 100 while MOQ was parsed separately
 * out of "MOQ 250".
 *
 * This is a script rather than a boot-time migration on purpose. That same
 * state is what ordinary selling produces — stock 300 against MOQ 250, one
 * order of 250, and 50 is left — so it is indistinguishable from genuinely
 * depleted inventory. Restocking is a business decision, and a human makes it.
 *
 *   node server/scripts/repairStock.js            # dry run, changes nothing
 *   node server/scripts/repairStock.js --apply    # write the new stock levels
 *
 * Stock of exactly 0 is left alone: sold out is a real, intentional state.
 */
const APPLY = process.argv.includes("--apply");

const run = async () => {
  await connectDB();

  const products = await Product.find({ status: "active" }).lean();
  const stranded = products.filter((product) => {
    const stock = Number(product.stock);
    return Number.isFinite(stock) && stock > 0 && stock < getMinimumOrderQty(product);
  });

  if (stranded.length === 0) {
    console.log("[repair:stock] No products are stranded below their minimum order quantity.");
    await mongoose.disconnect();
    return;
  }

  console.log(`[repair:stock] ${stranded.length} product(s) cannot be bought by anyone:\n`);
  for (const product of stranded) {
    const moq = getMinimumOrderQty(product);
    const proposed = Math.max(100, moq * 10);
    console.log(`  ${product.id}`);
    console.log(`    stock ${product.stock} < MOQ ${moq}  ->  proposed stock ${proposed}`);
  }

  if (!APPLY) {
    console.log("\n[repair:stock] Dry run — nothing was changed.");
    console.log("[repair:stock] Re-run with --apply to write these values.");
    await mongoose.disconnect();
    return;
  }

  for (const product of stranded) {
    const proposed = Math.max(100, getMinimumOrderQty(product) * 10);
    await Product.updateOne({ id: product.id }, { $set: { stock: proposed } });
    console.log(`[repair:stock] ${product.id} stock -> ${proposed}`);
  }

  console.log(`\n[repair:stock] Updated ${stranded.length} product(s).`);
  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[repair:stock] Failed:", error);
    process.exit(1);
  });
