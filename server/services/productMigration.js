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

    await upsertProduct({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      images: product.images,
      price: product.price,
      mrp: product.price,
      stock: existing?.stock ?? 100,
      status: "active",
      leadTime: product.leadTime || "",
      minimumOrderQty: parseMinimumOrderQty(product.minimum),
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
