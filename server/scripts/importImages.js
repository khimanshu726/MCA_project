import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import cloudinary from "../config/cloudinary.js";
import { isCloudinaryConfigured } from "../config/uploadStorage.js";
import { DATASET_PATH, loadImageMap, matchImagesToProducts, readDataset } from "./imageMatching.js";

/**
 * Match a folder of product photos to the right products (and Ram Lala colour
 * variants) by ASIN → SKU → mapping file (never product name; see
 * imageMatching.js), upload matched files to Cloudinary, and write the URLs back
 * into data/photo-frames.json. Products stay draft; nothing goes live here.
 *
 *   --report                    print who has images vs. is missing. No images needed.
 *   --dry-run [--dir=… --map=…] match + report; upload/write nothing.
 *   (default) [--dir=… --map=…] match, upload to Cloudinary, write URLs. Default
 *                               dir: data/frame-images. Optional --map=image-map.csv
 *                               (filename,asin,sku) for arbitrary filenames.
 */

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const listImageFiles = (dir) => {
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
    }
  };
  walk(dir);
  return out.map((full) => path.relative(dir, full));
};

const statusOf = (product, bucket) => {
  const count = bucket ? bucket.files.length : product.images.length;
  if (count === 0) return "MISSING";
  const hasMain = bucket ? bucket.hasMain : product.images.length > 0;
  return hasMain ? "MATCHED" : "NO-MAIN";
};

const printReport = (products, perProduct, unmatched, asinNotFound) => {
  const rows = products.map((p) => {
    const bucket = perProduct.get(p.id);
    return {
      product: p.id,
      asin: p.asin || "—",
      sku: p.sku,
      images: bucket ? bucket.files.length : p.images.length,
      main: statusOf(p, bucket) === "MATCHED" ? "Yes" : statusOf(p, bucket) === "NO-MAIN" ? "review" : "—",
      status: statusOf(p, bucket),
    };
  });

  const withImages = rows.filter((r) => r.images > 0).length;
  console.log(`\nIMAGE MATCH REPORT — ${withImages}/${products.length} products have images\n`);
  console.log("| Product | ASIN | SKU | Images | Main | Status |");
  console.log("|---------|------|-----|-------:|------|--------|");
  for (const r of rows) {
    console.log(`| ${r.product} | ${r.asin} | ${r.sku} | ${r.images} | ${r.main} | ${r.status} |`);
    const product = products.find((p) => p.id === r.product);
    for (const variant of product._variants || []) {
      const n = (perProduct.get(product.id)?.files || []).filter((f) => f.variant === variant.colour).length;
      console.log(`|   └ ${variant.colour} | ${variant.asin} | ${variant.sku} | ${n} | | ${n ? "MATCHED" : "MISSING"} |`);
    }
  }

  const missing = rows.filter((r) => r.status === "MISSING");
  if (missing.length) {
    console.log(`\nMISSING images (${missing.length}):`);
    for (const r of missing) console.log(`  ✗ ${r.product} — name files with ASIN ${r.asin} or SKU ${r.sku}`);
  }
  const noMain = rows.filter((r) => r.status === "NO-MAIN");
  if (noMain.length) {
    console.log(`\nNo explicit MAIN image — REVIEW (${noMain.length}):`);
    for (const r of noMain) console.log(`  ! ${r.product} — matched ${r.images} image(s) but none flagged MAIN`);
  }
  if (asinNotFound.length) {
    console.log(`\nASIN in filename not found in the dataset (${asinNotFound.length}):`);
    for (const a of asinNotFound) console.log(`  ? ${a.relPath} — ASIN ${a.asin} is not one of the Photo Frame products`);
  }
  if (unmatched.length) {
    console.log(`\nUnmatched files — no ASIN/SKU, NOT assigned (${unmatched.length}). Add them to a --map CSV:`);
    for (const f of unmatched) console.log(`  - ${f}`);
  }
  console.log("");
};

const uploadToCloudinary = async (absPath, publicId) => {
  const result = await cloudinary.uploader.upload(absPath, {
    folder: "elite-empressions/products",
    public_id: publicId,
    overwrite: true,
  });
  return result.secure_url;
};

const run = async () => {
  const args = process.argv.slice(2);
  const reportOnly = args.includes("--report");
  const dryRun = args.includes("--dry-run");
  const imagesDir = path.resolve(args.find((a) => a.startsWith("--dir="))?.slice(6) || "data/frame-images");
  const mapPath = args.find((a) => a.startsWith("--map="))?.slice(6);

  const dataset = readDataset();
  const { products } = dataset;

  if (reportOnly) {
    printReport(products, new Map(), [], []);
    return;
  }

  if (!fs.existsSync(imagesDir)) {
    console.error(`[import:images] Images directory not found: ${imagesDir}`);
    console.error(`[import:images] Put your photos there (named/foldered by ASIN or SKU, or supply --map=…) and re-run,`);
    console.error(`[import:images] or use --report to see current status.`);
    process.exit(1);
  }

  const map = loadImageMap(mapPath ? path.resolve(mapPath) : null);
  const relPaths = listImageFiles(imagesDir);
  const { perProduct, unmatched, asinNotFound } = matchImagesToProducts(relPaths, products, { map });
  printReport(products, perProduct, unmatched, asinNotFound);

  if (dryRun) {
    console.log("[import:images] Dry run — nothing uploaded or written.");
    return;
  }

  if (!isCloudinaryConfigured()) {
    console.error("[import:images] Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).");
    console.error("[import:images] Images must be uploaded to durable storage — aborting without writing.");
    process.exit(1);
  }

  for (const product of products) {
    const bucket = perProduct.get(product.id);
    if (!bucket?.files.length) continue;

    const seenHashes = new Map(); // content hash -> url, to skip identical duplicates
    const urls = [];
    for (const item of bucket.files) {
      const absPath = path.join(imagesDir, item.relPath);
      const hash = crypto.createHash("sha1").update(fs.readFileSync(absPath)).digest("hex");
      if (seenHashes.has(hash)) {
        console.log(`[import:images]   duplicate skipped: ${item.relPath}`);
        continue;
      }
      const url = await uploadToCloudinary(absPath, `${product.id}-${urls.length + 1}`);
      seenHashes.set(hash, url);
      urls.push({ url, variant: item.variant });
    }

    product.images = urls.map((u) => u.url);
    for (const variant of product._variants || []) {
      variant.images = urls.filter((u) => u.variant === variant.colour).map((u) => u.url);
    }
    console.log(`[import:images] ${product.id}: uploaded ${urls.length} image(s).`);
  }

  fs.writeFileSync(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`[import:images] Wrote image URLs into ${DATASET_PATH}. Products remain draft — review, then run import:products.`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error("[import:images] Failed:", error);
    process.exit(1);
  });
}
