import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { products as storefrontProducts } from "../../src/data.js";
import { getMinimumOrderQty, isProductOutOfStock } from "../../src/utils/productAvailability.js";

const legacyProductsPath = path.resolve(process.cwd(), "server", "data", "products.json");

const parseMinimumOrderQty = (minimum) => {
  const match = /\d+/.exec(minimum || "");
  return match ? Number(match[0]) : 1;
};

/**
 * Seed stock has to be able to satisfy the product's own minimum order
 * quantity, or the product is unsellable the moment it's created.
 *
 * This used to be a flat `100` for everything while MOQ was parsed
 * independently from a string ("MOQ 250" -> 250), so `launch-flyer` shipped
 * with stock 100 against a minimum of 250 — addable to the cart, then priced
 * at zero with checkout blocked. Deriving one from the other means a new
 * product can't be seeded into that state again.
 */
const seedStockFor = (minimumOrderQty) => Math.max(100, minimumOrderQty * 10);

/**
 * Stock for a seeded product. A new row gets a MOQ-aware default; an existing
 * row always keeps whatever it has — that number is live inventory, and a
 * re-run must never reset it.
 *
 * Repairing an existing row is deliberately not done here, because this path
 * can't tell why the stock is low. See repairUnsellableSeedStock(), which can:
 * it only touches products that were never ordered.
 */
const resolveSeedStock = (existingStock, minimumOrderQty) =>
  existingStock === undefined || existingStock === null ? seedStockFor(minimumOrderQty) : existingStock;

const featuredIds = new Set(storefrontProducts.slice(0, 4).map((product) => product.id));

const upsertProduct = (doc) =>
  Product.findOneAndUpdate(
    { id: doc.id },
    { $set: doc },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

const migrateStorefrontProducts = async () => {
  let created = 0;
  let updated = 0;

  for (const product of storefrontProducts) {
    const existing = await Product.findOne({ id: product.id });
    const minimumOrderQty = parseMinimumOrderQty(product.minimum);

    await upsertProduct({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      images: product.images,
      price: product.price,
      mrp: product.price,
      // Existing stock is preserved — it's live inventory that depletes as
      // orders are placed, so a redeploy must never reset it.
      stock: resolveSeedStock(existing?.stock, minimumOrderQty),
      status: "active",
      leadTime: product.leadTime || "",
      minimumOrderQty,
      badge: product.badge || "",
      materials: product.materials || [],
      audience: product.audience || "",
      featured: featuredIds.has(product.id),
      source: "data-js-seed",
    });

    if (existing) updated += 1;
    else created += 1;
  }

  return { created, updated };
};

const readLegacyAdminProducts = async () => {
  try {
    const raw = await readFile(legacyProductsPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const migrateAdminJsonProducts = async () => {
  const legacyProducts = await readLegacyAdminProducts();
  let created = 0;
  let updated = 0;

  for (const legacy of legacyProducts) {
    if (!legacy?.name || !legacy?.category || !legacy?.imageUrl) {
      continue;
    }

    const id = legacy.id || crypto.randomUUID();
    const existing = await Product.findOne({ id });

    await upsertProduct({
      id,
      name: legacy.name,
      description: legacy.description || "",
      category: legacy.category,
      images: [legacy.imageUrl],
      price: Number(legacy.basePrice) || 0,
      mrp: Number(legacy.basePrice) || 0,
      stock: existing?.stock ?? 50,
      status: legacy.status === "active" ? "active" : "draft",
      source: "admin-json-seed",
    });

    if (existing) updated += 1;
    else created += 1;
  }

  return { created, updated };
};

export const migrateLegacyProducts = async () => {
  const storefront = await migrateStorefrontProducts();
  const adminJson = await migrateAdminJsonProducts();
  return { storefront, adminJson };
};

// Auto-seed on server startup only when the collection is empty, so a real
// deployment's admin-edited catalog is never overwritten by the legacy seed.
/**
 * Repairs seeded products that were born unsellable.
 *
 * The old seed gave every product a flat stock of 100 while parsing MOQ
 * separately out of a string, so `launch-flyer` shipped with stock 100 against
 * a minimum of 250. Nobody can buy it: the cart rejects it, and no customer
 * can order below the minimum to work it down.
 *
 * Fixing the seed default only helps a fresh database, and ensureProductsSeeded
 * skips a populated one, so already-deployed rows would stay broken forever —
 * with no admin UI for stock to fix them by hand.
 *
 * The obvious guard "stock < MOQ means it was seeded wrong" is NOT safe on its
 * own: selling produces that state too (stock 300, MOQ 250, one order of 250,
 * 50 left), and topping that up would silently restock a product that really
 * ran out. So this additionally requires the product to have never appeared in
 * an order — if it was never sold, selling cannot be why it's short, which
 * leaves the seed as the only explanation.
 *
 * Scoped to `data-js-seed` rows so an admin-authored catalog is never touched.
 */
const repairUnsellableSeedStock = async () => {
  const seeded = await Product.find({ source: "data-js-seed" }).lean();
  const suspects = seeded.filter((product) => Number(product.stock) > 0 && isProductOutOfStock(product));

  if (suspects.length === 0) return { repaired: 0 };

  const soldIds = new Set(
    await Order.distinct("lineItems.productId", {
      "lineItems.productId": { $in: suspects.map((p) => p.id) },
    }),
  );

  const repairable = suspects.filter((product) => !soldIds.has(product.id));

  for (const product of repairable) {
    const stock = seedStockFor(getMinimumOrderQty(product));
    await Product.updateOne({ id: product.id }, { $set: { stock } });
    console.log(
      `[seed:repair] ${product.id} was unsellable (stock ${product.stock} < MOQ ` +
        `${getMinimumOrderQty(product)}) and never ordered — stock -> ${stock}`,
    );
  }

  return { repaired: repairable.length, skipped: suspects.length - repairable.length };
};

// Auto-seed on server startup only when the collection is empty, so a real
// deployment's admin-edited catalog is never overwritten by the legacy seed.
// The stock repair runs either way: it's the one state that can't be recovered
// from through the UI, and it's provably a seeding error, not inventory.
export const ensureProductsSeeded = async () => {
  const existingCount = await Product.countDocuments();

  if (existingCount > 0) {
    const repair = await repairUnsellableSeedStock();
    return { seeded: false, ...repair };
  }

  const result = await migrateLegacyProducts();
  return { seeded: true, ...result };
};
