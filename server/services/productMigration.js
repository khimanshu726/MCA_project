import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Product } from "../models/Product.js";
import { products as storefrontProducts } from "../../src/data.js";

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
 * row always keeps whatever it has.
 *
 * Deliberately does NOT "repair" an existing row sitting below its own MOQ,
 * even though that's the state that made launch-flyer unsellable. That state
 * is also what legitimate selling produces — stock 300 against MOQ 250, one
 * order of 250, and 50 is left — which means it reads identically to genuinely
 * depleted inventory. Auto-topping it up would silently restock a product that
 * really has run out. Fixing the seed default stops new products being born
 * broken; repairing existing rows is an inventory decision and belongs to the
 * admin (or scripts/repairStock.js), not to a boot-time side effect.
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
export const ensureProductsSeeded = async () => {
  const existingCount = await Product.countDocuments();

  if (existingCount > 0) {
    return { seeded: false };
  }

  const result = await migrateLegacyProducts();
  return { seeded: true, ...result };
};
