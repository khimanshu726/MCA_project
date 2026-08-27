import fs from "node:fs";
import path from "node:path";

/**
 * Pure image → product/variant matching. Match priority (never product name):
 *   1. ASIN in the filename/path
 *   2. Seller SKU in the filename/path
 *   3. An explicit mapping file (filename,asin,sku)
 * A file that matches none of these is reported, never guessed onto a product.
 * No Cloudinary/multer/fs-walking here so it stays trivially testable; the I/O
 * lives in importImages.js.
 */

const ASIN_RE = /(B0[A-Z0-9]{8})/i; // Amazon ASIN shape

// Resolved from the working directory (repo root, where `npm run` executes)
// rather than import.meta.url — the latter is not a file URL under the test
// runner and throws.
export const DATASET_PATH = path.resolve(process.cwd(), "data/photo-frames.json");

export const readDataset = (file = DATASET_PATH) => JSON.parse(fs.readFileSync(file, "utf8"));

/** True when a filename marks itself the primary image (…MAIN…). */
export const isMainImage = (name) => /(^|[^a-z0-9])main([^a-z0-9]|$)/i.test(name);

/** Build ASIN→target and SKU→target lookups from products and their variants. */
export const buildIdentifierIndex = (products) => {
  const byAsin = new Map();
  const bySku = new Map();
  for (const product of products) {
    if (product.asin) byAsin.set(product.asin.toUpperCase(), { id: product.id, variant: null });
    if (product.sku) bySku.set(product.sku.toLowerCase(), { id: product.id, variant: null });
    for (const variant of product._variants || []) {
      if (variant.asin) byAsin.set(variant.asin.toUpperCase(), { id: product.id, variant: variant.colour });
      if (variant.sku) bySku.set(variant.sku.toLowerCase(), { id: product.id, variant: variant.colour });
    }
  }
  return { byAsin, bySku };
};

/**
 * Parse an optional mapping CSV (`filename,asin,sku` header) into
 * Map<filenameLower, {asin, sku}>. Lets arbitrary/Amazon-generated filenames be
 * matched without renaming the files.
 */
export const loadImageMap = (csvPath) => {
  const map = new Map();
  if (!csvPath || !fs.existsSync(csvPath)) return map;
  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.toLowerCase().split(",").map((h) => h.trim()) ?? [];
  const col = (name) => header.indexOf(name);
  for (const line of lines) {
    const cells = line.split(",").map((c) => c.trim());
    const filename = cells[col("filename")];
    if (!filename) continue;
    map.set(filename.toLowerCase(), { asin: cells[col("asin")] || "", sku: cells[col("sku")] || "" });
  }
  return map;
};

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const skuAppearsAsToken = (haystack, sku) =>
  new RegExp(`(^|[^a-z0-9])${escapeRe(sku)}([^a-z0-9]|$)`, "i").test(haystack);

const resolveAsin = (asin, index) => {
  const key = asin.toUpperCase();
  if (index.byAsin.has(key)) return { ...index.byAsin.get(key), by: "asin", key };
  return { asinNotFound: key };
};

const resolveSku = (haystack, index) => {
  for (const [sku, target] of index.bySku) {
    if (skuAppearsAsToken(haystack, sku)) return { ...target, by: "sku", key: sku };
  }
  return null;
};

/**
 * Match one filename (relative path) to a product/variant. Returns a match
 * ({id, variant, by, key}), an { asinNotFound } marker (an ASIN was named but
 * belongs to no product here), or null (no identifier — needs a mapping).
 * `map` is an optional filename→{asin,sku} lookup (priority 3).
 */
export const matchFile = (relPath, index, map = new Map()) => {
  const base = path.basename(relPath).toLowerCase();
  const mapped = map.get(base);
  if (mapped) {
    if (mapped.asin) return resolveAsin(mapped.asin, index);
    if (mapped.sku) {
      const hit = resolveSku(mapped.sku, index);
      if (hit) return hit;
    }
  }

  const asin = relPath.match(ASIN_RE)?.[1];
  if (asin) return resolveAsin(asin, index);

  return resolveSku(relPath, index);
};

/** Sorts the MAIN image first, then alphabetically. */
export const orderImages = (a, b) => {
  const rank = (name) => (isMainImage(name) ? 0 : /(^|[^a-z0-9])0*1([^a-z0-9]|$)/.test(name) ? 1 : 2);
  return rank(a) - rank(b) || a.localeCompare(b);
};

/**
 * Group relative image paths by product, preserving variant info and marking
 * the primary image; report the rest.
 *
 * Returns { perProduct: Map<id, {files, hasMain}>, unmatched, asinNotFound }.
 */
export const matchImagesToProducts = (relPaths, products, { map = new Map() } = {}) => {
  const index = buildIdentifierIndex(products);
  const perProduct = new Map();
  const unmatched = [];
  const asinNotFound = [];

  for (const relPath of [...relPaths].sort(orderImages)) {
    const match = matchFile(relPath, index, map);
    if (!match) {
      unmatched.push(relPath);
      continue;
    }
    if (match.asinNotFound) {
      asinNotFound.push({ relPath, asin: match.asinNotFound });
      continue;
    }
    if (!perProduct.has(match.id)) perProduct.set(match.id, { files: [], hasMain: false });
    const bucket = perProduct.get(match.id);
    const main = isMainImage(relPath);
    bucket.files.push({ relPath, variant: match.variant, isMain: main, by: match.by, key: match.key });
    if (main) bucket.hasMain = true;
  }

  return { perProduct, unmatched, asinNotFound };
};
