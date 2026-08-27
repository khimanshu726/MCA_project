import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { pathToFileURL } from "node:url";
import { buildIdentifierIndex, readDataset } from "./imageMatching.js";
import { selectBestImages } from "./spapiCatalog.js";

config();

/**
 * Fetch the Photo Frame product images from Amazon via the OFFICIAL Selling
 * Partner API (Catalog Items, getCatalogItem, includedData=images) and download
 * them into the same folder layout the finalizer/importer understand:
 *
 *   frame-images-raw/<ASIN>/<ASIN>_MAIN.jpg, <ASIN>_01.jpg, …
 *
 * No scraping, no browser automation. Auth is LWA only — since 2023 SP-API no
 * longer requires AWS SigV4 signing, so an access token from your refresh token
 * is enough.
 *
 * Required env (server-side only; never commit): SPAPI_CLIENT_ID,
 * SPAPI_CLIENT_SECRET, SPAPI_REFRESH_TOKEN. Optional: SPAPI_MARKETPLACE_ID
 * (default A21TJRUUN4KGV = amazon.in), SPAPI_ENDPOINT (default the EU host that
 * serves India).
 */

const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
const DEFAULT_ENDPOINT = "https://sellingpartnerapi-eu.amazon.com"; // EU region serves amazon.in
const DEFAULT_MARKETPLACE = "A21TJRUUN4KGV"; // amazon.in

const requireEnv = () => {
  const { SPAPI_CLIENT_ID, SPAPI_CLIENT_SECRET, SPAPI_REFRESH_TOKEN } = process.env;
  if (!SPAPI_CLIENT_ID || !SPAPI_CLIENT_SECRET || !SPAPI_REFRESH_TOKEN) {
    throw new Error(
      "Missing SP-API credentials. Set SPAPI_CLIENT_ID, SPAPI_CLIENT_SECRET, and SPAPI_REFRESH_TOKEN in the server .env.",
    );
  }
  return { SPAPI_CLIENT_ID, SPAPI_CLIENT_SECRET, SPAPI_REFRESH_TOKEN };
};

const getAccessToken = async ({ SPAPI_CLIENT_ID, SPAPI_CLIENT_SECRET, SPAPI_REFRESH_TOKEN }) => {
  const res = await fetch(LWA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPAPI_REFRESH_TOKEN,
      client_id: SPAPI_CLIENT_ID,
      client_secret: SPAPI_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`LWA token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
};

const getCatalogItem = async (asin, accessToken, endpoint, marketplaceId) => {
  const url = `${endpoint}/catalog/2022-04-01/items/${asin}?marketplaceIds=${marketplaceId}&includedData=images`;
  const res = await fetch(url, { headers: { "x-amz-access-token": accessToken } });
  if (!res.ok) {
    return { error: `${res.status} ${(await res.text()).slice(0, 300)}` };
  }
  return { data: await res.json() };
};

const extFromLink = (link) => {
  const ext = path.extname(new URL(link).pathname).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
};

const download = async (link, destPath) => {
  const res = await fetch(link);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  const args = process.argv.slice(2);
  const outRoot = path.resolve(args.find((a) => a.startsWith("--out="))?.slice(6) || "frame-images-raw");
  const endpoint = process.env.SPAPI_ENDPOINT || DEFAULT_ENDPOINT;
  const marketplaceId = process.env.SPAPI_MARKETPLACE_ID || DEFAULT_MARKETPLACE;

  const creds = requireEnv();
  const dataset = readDataset();
  const index = buildIdentifierIndex(dataset.products);
  // Every ASIN, deduped — includes Ram Lala's three colour ASINs, each fetched
  // and stored under its own folder so the colours never merge.
  const asins = [
    ...new Set(dataset.products.flatMap((p) => [p.asin, ...(p._variants || []).map((v) => v.asin)]).filter(Boolean)),
  ];

  console.log(`[fetch:amazon-images] Marketplace ${marketplaceId} via ${endpoint}`);
  const accessToken = await getAccessToken(creds);
  console.log(`[fetch:amazon-images] Authenticated. Fetching ${asins.length} ASIN(s)…\n`);

  const report = [];
  for (const asin of asins) {
    const { data, error } = await getCatalogItem(asin, accessToken, endpoint, marketplaceId);
    if (error) {
      report.push({ asin, count: 0, main: false, status: `ERROR ${error}` });
      await sleep(600);
      continue;
    }

    const images = selectBestImages(data, marketplaceId);
    if (images.length === 0) {
      report.push({ asin, count: 0, main: false, status: "NO IMAGES RETURNED" });
      await sleep(600);
      continue;
    }

    const dir = path.join(outRoot, asin);
    fs.mkdirSync(dir, { recursive: true });
    let gallery = 0;
    let hasMain = false;
    for (const img of images) {
      const isMainVariant = img.variant === "MAIN";
      if (isMainVariant) hasMain = true;
      const suffix = isMainVariant ? "MAIN" : String(++gallery).padStart(2, "0");
      await download(img.link, path.join(dir, `${asin}_${suffix}${extFromLink(img.link)}`));
    }
    report.push({ asin, count: images.length, main: hasMain, status: "OK" });
    console.log(`  ✓ ${asin}: ${images.length} image(s)${hasMain ? "" : " (no MAIN)"}`);
    await sleep(600); // stay well under the getCatalogItem rate limit
  }

  console.log(`\n[fetch:amazon-images] Report:\n`);
  console.log("| ASIN | Images | MAIN | Status |");
  console.log("|------|-------:|------|--------|");
  for (const r of report) console.log(`| ${r.asin} | ${r.count} | ${r.main ? "Yes" : "—"} | ${r.status} |`);
  console.log(`\n[fetch:amazon-images] Downloaded into ${outRoot}. Next: npm run prepare:frame-images, then import:images.\n`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error("[fetch:amazon-images] Failed:", error.message);
    process.exit(1);
  });
}
