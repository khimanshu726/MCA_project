import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Product } from "../models/Product.js";
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
 * and until recently there was no admin UI for stock to fix them by hand.
 *
 * "stock < MOQ means it was seeded wrong" is NOT safe on its own: selling
 * produces that state too (stock 300, MOQ 250, one order of 250, 50 left), and
 * topping that up would silently restock a product that really ran out.
 *
 * The first attempt at that guard asked "has this product ever appeared in an
 * order". That was a bad proxy, and it's why launch-flyer went unrepaired on
 * production: it counts an order in ANY state — cancelled, payment-failed, or
 * an ancient test order predating server-side stock decrement entirely — none
 * of which mean a single unit was actually sold. Worse, it decided silently.
 *
 * `updatedAt === createdAt` is direct evidence instead of a proxy: the row has
 * not been modified since it was created, so nothing — selling included — has
 * touched its stock. An untouched row holds exactly what the seeder wrote, so
 * if that is below its own MOQ, the seeder is the only possible author.
 *
 * A row that HAS been modified is left alone and logged: its low stock may be
 * real depletion, and that is a restocking decision for a human with the admin
 * catalog, not a boot-time side effect.
 *
 * Scoped to `data-js-seed` rows so an admin-authored catalog is never touched.
 */

// Mongoose sets both timestamps from one clock read on insert, so an untouched
// row has them identical; the tolerance is only insurance against a path that
// sets them a tick apart.
const UNTOUCHED_TOLERANCE_MS = 1000;

const wasNeverModifiedSinceSeeding = (product) => {
  if (!product.createdAt || !product.updatedAt) return false;
  return Math.abs(new Date(product.updatedAt) - new Date(product.createdAt)) <= UNTOUCHED_TOLERANCE_MS;
};

const repairUnsellableSeedStock = async () => {
  const seeded = await Product.find({ source: "data-js-seed" }).lean();
  const unsellable = seeded.filter((product) => Number(product.stock) > 0 && isProductOutOfStock(product));

  if (unsellable.length === 0) {
    return { repaired: 0, skipped: 0 };
  }

  let repaired = 0;
  let skipped = 0;

  for (const product of unsellable) {
    const moq = getMinimumOrderQty(product);

    if (!wasNeverModifiedSinceSeeding(product)) {
      skipped += 1;
      // Loud on purpose. The previous version said nothing when it skipped,
      // which is exactly why an unrepaired product was a mystery instead of a
      // log line.
      console.warn(
        `[seed:repair] ${product.id} is UNSELLABLE (stock ${product.stock} < MOQ ${moq}) but its row has ` +
          `changed since seeding, so the low stock may be real depletion — left alone. ` +
          `Restock it in the admin catalog if that's wrong.`,
      );
      continue;
    }

    const stock = seedStockFor(moq);
    await Product.updateOne({ id: product.id }, { $set: { stock } });
    repaired += 1;
    console.log(
      `[seed:repair] ${product.id} was seeded unsellable (stock ${product.stock} < MOQ ${moq}) and never ` +
        `modified since — stock -> ${stock}`,
    );
  }

  return { repaired, skipped };
};

// Auto-seed on server startup only when the collection is empty, so a real
// deployment's admin-edited catalog is never overwritten by the legacy seed.
// On a populated database the seed is skipped but the stock repair still runs,
// since that's the one state a deployed row can be stuck in.
export const ensureProductsSeeded = async () => {
  const existingCount = await Product.countDocuments();

  if (existingCount > 0) {
    try {
      const repair = await repairUnsellableSeedStock();
      return { seeded: false, ...repair };
    } catch (error) {
      // Never fatal. startServer() exits the process if this rejects, and
      // taking the whole storefront down over a stock-tidying task would be a
      // far worse outage than the one it fixes.
      console.error("[seed:repair] failed — continuing startup without it.", error);
      return { seeded: false, repaired: 0, skipped: 0, failed: true };
    }
  }

  const result = await migrateLegacyProducts();
  return { seeded: true, ...result };
};
