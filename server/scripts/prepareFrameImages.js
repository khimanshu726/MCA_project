import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { buildIdentifierIndex, readDataset } from "./imageMatching.js";

/**
 * LOCAL finalizer for manually-saved Amazon product images — Option D of the
 * collection spec. It does NOT touch Amazon: you save your own images from
 * Seller Central Image Manager (your own access), then this validates, renames,
 * manifests, and zips them for the Photo Frames importer.
 *
 * Input (default ./frame-images-raw): one subfolder per ASIN, e.g.
 *   frame-images-raw/B0DNY13XGX/<whatever you saved>.jpg
 * Put "MAIN" in the primary image's filename (a one-file rename); other files
 * can keep any name. PT01…PT08 or 01…08 in a name set the gallery order.
 *
 * Output (./elite-impressions-photo-frame-images):
 *   B0DNY13XGX_MAIN.jpg, B0DNY13XGX_01.jpg, … + manifest.csv + a .zip
 * Originals are never modified (files are copied, not renamed in place).
 *
 * MAIN is used only when a file clearly says so; otherwise the product is
 * flagged MAIN_IMAGE_UNCERTAIN and no image is labelled MAIN (spec §9).
 */

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const ASIN_RE = /(B0[A-Z0-9]{8})/i;

// Magic-byte format check — catches corrupt/mislabelled files without an image
// library (Cloudinary does deeper validation at upload).
export const detectFormat = (buf) => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
};
const extForFormat = { jpg: ".jpg", png: ".png", webp: ".webp" };

export const isMain = (name) => /(^|[^a-z0-9])main([^a-z0-9]|$)/i.test(name);
export const slotRank = (name) => {
  if (isMain(name)) return 0;
  const pt = name.match(/pt\s*0*([1-9][0-9]?)/i);
  if (pt) return Number(pt[1]);
  const num = name.match(/(^|[^a-z0-9])0*([1-9][0-9]?)([^a-z0-9]|$)/);
  if (num) return Number(num[2]);
  return 999;
};
const slotLabel = (name, isMainImage) => {
  if (isMainImage) return "MAIN";
  const pt = name.match(/pt\s*0*([1-9][0-9]?)/i);
  if (pt) return `PT0${pt[1]}`.replace(/PT0(\d\d)/, "PT$1");
  return "";
};

const listFiles = (dir) => {
  const out = [];
  const walk = (cur) => {
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
    }
  };
  walk(dir);
  return out;
};

const csvCell = (value) => {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const run = () => {
  const args = process.argv.slice(2);
  const inDir = path.resolve(args.find((a) => a.startsWith("--in="))?.slice(5) || "frame-images-raw");
  const outDir = path.resolve(args.find((a) => a.startsWith("--out="))?.slice(6) || "elite-impressions-photo-frame-images");
  const noZip = args.includes("--no-zip");

  const dataset = readDataset();
  const index = buildIdentifierIndex(dataset.products);
  // ASIN → { product label, sku } including Ram Lala's per-colour variants.
  const detailFor = (asin) => {
    const target = index.byAsin.get(asin.toUpperCase());
    if (!target) return null;
    const product = dataset.products.find((p) => p.id === target.id);
    if (target.variant) {
      const variant = (product._variants || []).find((v) => v.colour === target.variant);
      return { product: `${product.name} (${target.variant})`, sku: variant?.sku || product.sku };
    }
    return { product: product.name, sku: product.sku };
  };

  if (!fs.existsSync(inDir)) {
    console.error(`[prepare:frame-images] Input folder not found: ${inDir}`);
    console.error(`[prepare:frame-images] Create it with one subfolder per ASIN and save your images there.`);
    process.exit(1);
  }

  // Group input files by the ASIN in their path (folder or filename). Each ASIN
  // is its own group — Ram Lala colours never merge.
  const groups = new Map();
  const unmatched = [];
  for (const abs of listFiles(inDir)) {
    const rel = path.relative(inDir, abs);
    const asin = rel.match(ASIN_RE)?.[1]?.toUpperCase();
    if (!asin || !index.byAsin.has(asin)) {
      unmatched.push({ rel, asin: asin || "" });
      continue;
    }
    if (!groups.has(asin)) groups.set(asin, []);
    groups.get(asin).push({ abs, rel, name: path.basename(rel) });
  }

  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [["filename", "asin", "sku", "product", "amazon_slot", "source_url", "status"]];
  const invalid = [];
  const uncertainMain = [];

  for (const [asin, files] of groups) {
    files.sort((a, b) => slotRank(a.name) - slotRank(b.name) || a.name.localeCompare(b.name));
    const detail = detailFor(asin) || { product: "", sku: "" };
    const hasMain = files.some((f) => isMain(f.name));
    if (!hasMain) uncertainMain.push(asin);

    let galleryIndex = 0;
    for (const file of files) {
      const buf = fs.readFileSync(file.abs);
      const format = detectFormat(buf);
      if (!format || buf.length < 1024) {
        invalid.push({ rel: file.rel, reason: !format ? "not a valid JPG/PNG/WEBP" : "suspiciously small" });
        manifest.push([file.name, asin, detail.sku, detail.product, "", file.rel, "INVALID"]);
        continue;
      }
      const main = hasMain && isMain(file.name);
      const suffix = main ? "MAIN" : String(++galleryIndex).padStart(2, "0");
      const outName = `${asin}_${suffix}${extForFormat[format]}`;
      fs.copyFileSync(file.abs, path.join(outDir, outName));
      const status = !hasMain ? "OK_MAIN_UNCERTAIN" : "OK";
      manifest.push([outName, asin, detail.sku, detail.product, slotLabel(file.name, main), file.rel, status]);
    }
  }

  fs.writeFileSync(
    path.join(outDir, "manifest.csv"),
    manifest.map((row) => row.map(csvCell).join(",")).join("\n") + "\n",
  );

  // Report
  const known = [
    ...new Set(dataset.products.flatMap((p) => [p.asin, ...(p._variants || []).map((v) => v.asin)]).filter(Boolean)),
  ];
  console.log(`\n[prepare:frame-images] Output: ${outDir}\n`);
  console.log("| ASIN | Product | Images | MAIN |");
  console.log("|------|---------|-------:|------|");
  for (const asin of known) {
    const files = groups.get(asin) || [];
    const detail = detailFor(asin) || { product: "" };
    const mainState = files.length === 0 ? "—" : uncertainMain.includes(asin) ? "UNCERTAIN" : "Yes";
    console.log(`| ${asin} | ${detail.product} | ${files.length} | ${mainState} |`);
  }
  const missing = known.filter((a) => !groups.has(a));
  if (missing.length) console.log(`\nMissing (no images saved yet): ${missing.join(", ")}`);
  if (uncertainMain.length) console.log(`\nMAIN_IMAGE_UNCERTAIN (no file marked MAIN): ${uncertainMain.join(", ")}`);
  if (invalid.length) {
    console.log(`\nInvalid files (excluded):`);
    for (const i of invalid) console.log(`  - ${i.rel} (${i.reason})`);
  }
  if (unmatched.length) {
    console.log(`\nUnmatched files (no known ASIN in path — NOT assigned):`);
    for (const u of unmatched) console.log(`  - ${u.rel}`);
  }

  if (!noZip) {
    const zipPath = `${outDir}.zip`;
    try {
      fs.rmSync(zipPath, { force: true });
      execFileSync("powershell", [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force`,
      ]);
      console.log(`\n[prepare:frame-images] Zipped → ${zipPath}`);
    } catch {
      console.log(`\n[prepare:frame-images] Folder ready at ${outDir}. Zip it yourself, or the importer can read the folder via --dir.`);
    }
  }
  console.log("");
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
