# Product import pipeline

How Amazon (or any) product data becomes catalog rows, and how to keep it
maintainable.

```
Amazon Seller Central export  →  curated JSON  →  importer  →  MongoDB  →  website
   (Active Listings Report)      photo-frames.json   npm run import:products
```

## The dataset — `data/photo-frames.json`

The reviewable source of truth for the Photo Frames import. One object with a
`products` array; each product mirrors the Product model
(`server/models/Product.js`):

| field | notes |
|-------|-------|
| `id` | stable, kebab-case, used in the product URL `/products/:id` |
| `name`, `description` | cleaned from the Amazon title/description; no invented claims |
| `category` | `"Photo Frames"` |
| `images` | array of URLs. **Empty = skipped by the importer** (see below) |
| `price`, `mrp`, `stock` | from the report's `price`, `maximum-retail-price`, `quantity` |
| `sku`, `asin` | Amazon seller-sku and ASIN, preserved for traceability |
| `status` | `"draft"` — nothing shows on the storefront until set `active` |
| `materials` | spec bullets shown under "Finishes & options" |
| `options` | `{label, values[]}` — descriptive only, never affects price/stock |

Keys starting with `_` (e.g. `_variants`, `_flag`) are **provenance/notes only**
and are ignored by the importer. Top-level `flags` lists items that need a human
decision before go-live.

## Fetching images via SP-API (official, automated — `npm run fetch:amazon-images`)

The hands-off route: Amazon's **Selling Partner API** (Catalog Items,
`getCatalogItem`, `includedData=images`) returns your listing images by ASIN. No
scraping, no browser automation. Since 2023, SP-API needs **LWA credentials only**
(no AWS SigV4 signing).

**One-time setup (in your own Seller Central — I never see the secrets):**
1. Seller Central → **Apps & Services → Develop Apps** → create a **private/self**
   app with access to the **Catalog Items API** (the "Product Listing" role).
2. Note the app's **LWA client ID** and **client secret**.
3. **Authorize** the app for your own seller account and generate a **refresh token**.
4. Put these in the **server `.env`** (never frontend, never committed):
   ```env
   SPAPI_CLIENT_ID=amzn1.application-oa2-client.…
   SPAPI_CLIENT_SECRET=…
   SPAPI_REFRESH_TOKEN=Atzr|…
   # Optional (defaults are amazon.in): SPAPI_MARKETPLACE_ID=A21TJRUUN4KGV
   # SPAPI_ENDPOINT=https://sellingpartnerapi-eu.amazon.com
   ```

**Run it:**
```bash
npm run fetch:amazon-images
```
It authenticates via LWA, calls `getCatalogItem` for every ASIN in the dataset
(each Ram Lala colour separately), picks the **highest-resolution** image per
variant, and downloads them into `frame-images-raw/<ASIN>/<ASIN>_MAIN.jpg`,
`_01.jpg`, … — exactly the layout the finalizer/importer expect. Then run
`prepare:frame-images` (optional: validate + manifest + zip) and `import:images`.

## Collecting the images (manual, compliant — `npm run prepare:frame-images`)

Automated extraction from Seller Central's Image Manager is **not** done here:
Amazon's ToS prohibit automated access outside the official APIs, and automating
an authenticated Seller Central session risks the seller account. So you save your
own images through the normal browser UI, and a **local** finalizer prepares them.

1. In **Seller Central → Manage images → Image Manager**, search an ASIN, then
   right-click → **Save image as** each slot (MAIN, PT01…) into a folder named
   with that ASIN, under `frame-images-raw/`:

   ```
   frame-images-raw/
     B0DNY13XGX/   photo_MAIN.jpg   pt01.jpg   pt02.jpg  …   (one folder per ASIN)
     B0DND1MC6D/   MAIN.jpg  …                                (Ram Lala Pink — its own folder)
   ```
   Put `MAIN` in the primary image's filename; other files can keep any name.
   No other renaming needed. For Ram Lala, use each colour's **own** ASIN folder.

2. Run the finalizer (local only — touches nothing online):

   ```bash
   npm run prepare:frame-images                 # reads ./frame-images-raw
   npm run prepare:frame-images -- --in=… --out=…
   ```

   It validates each file (magic-byte JPG/PNG/WEBP check), copies (never renames
   originals) into `elite-impressions-photo-frame-images/` as `ASIN_MAIN.ext`,
   `ASIN_01.ext`, …, preserving MAIN → PT01 → PT02 order, writes `manifest.csv`
   (`filename,asin,sku,product,amazon_slot,source_url,status`), and zips the
   folder. A product with no file marked MAIN is flagged `MAIN_IMAGE_UNCERTAIN`;
   invalid/unmatched files are reported, never guessed onto a product.

3. Feed the resulting folder/zip to the matcher below (`import:images`).

## Images — matching workflow (`npm run import:images`)

The Active Listings Report's `image-url` column was blank, so every product ships
with `images: []`. **The product importer skips any product whose `images` is
empty** — expected, not an error, and it keeps the model's "at least one image"
rule satisfied.

There is no ToS-compliant way to pull the full image sets from Amazon by ASIN
(scraping is disallowed; SP-API/PA-API need credentials not set up here), so
images are supplied as files and matched by **ASIN or SKU — never by product
name** (`server/scripts/imageMatching.js`).

**File naming.** Put the photos in a folder (default `data/frame-images/`), with
each file's **ASIN or SKU in its filename or a subfolder name**, e.g.:

```
data/frame-images/
  B0DNXWGQYR_main.jpg      # ASIN → Buddha frame (main image first)
  B0DNXWGQYR_2.jpg
  AN-ES38-9WTF-detail.jpg  # SKU also works
  B0DND1MC6D_1.jpg         # Ram Lala PINK variant ASIN → ram-lala-a3-frame
  Ramlala_Red_1.jpg        # Ram Lala RED variant SKU → ram-lala-a3-frame
```

A file with `main` (or ending `-1`/`_1`/`01`) becomes the product's first image.
A file whose name matches no ASIN/SKU is **reported as unmatched, never guessed
onto a product**. Ram Lala's three colour ASINs/SKUs all resolve to the one
`ram-lala-a3-frame` product; the images pool into its gallery and each variant's
own URLs are recorded under `_variants[].images`.

**Arbitrary filenames?** If your files aren't named with an ASIN/SKU (e.g.
Amazon-generated names), supply a mapping CSV instead of renaming them:

```csv
filename,asin,sku
IMG_2098.jpg,B0DNXWGQYR,AN-ES38-9WTF
IMG_2099.jpg,B0DND1MC6D,Ramlala_Pink
```

**Run it:**

```bash
npm run import:images -- --report                       # report table: who has images, who's missing
npm run import:images -- --dry-run --dir=data/frame-images   # match + report, upload/write nothing
npm run import:images -- --dir=data/frame-images --map=data/image-map.csv   # upload + write URLs
```

Match priority: **ASIN → SKU → mapping CSV**; anything else is reported as
`unmatched` (never guessed). A filename containing `MAIN` becomes the primary
image; a product with images but no `MAIN` is flagged for review. Identical files
(same content hash) are uploaded once. Needs Cloudinary configured
(`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`); it aborts without writing if not,
so nothing lands in non-durable storage. Products stay `draft`. Then re-run the
product importer to push them to the DB.

Ram Lala's three colours each keep their own image set under `_variants[].images`
(pooled into the product gallery for now; the per-colour gallery swap on the
detail page is a small follow-up added when the images exist).

## Running the importer

```bash
npm run import:products -- --dry-run      # report what would happen, write nothing
npm run import:products                   # upsert into the DB it connects to
npm run import:products -- --file=data/other.json
```

- **Idempotent**: upserts by `id`, so re-running never creates duplicates —
  it updates existing rows in place. Safe to re-run after editing the JSON.
- Connects to the same `MONGODB_URI` the server uses. Point it at the
  production DB only when you intend to write there.
- Reuses `createProductRecord` / `updateProductRecord`, so schema validation,
  slug assignment, and the price ≤ MRP rule all apply.

## Go-live (after images + review)

1. Add images, re-run the importer (products still `draft`).
2. Review each product in the Admin panel; flip `status` to `active`.
3. The **Photo Frames** category then appears automatically on the catalog
   (chips/filter/search/detail are data-driven). The header shortcut and any
   homepage section are added last, so the category is never empty on
   production.

## Future products / Amazon sync

Add more rows to a JSON dataset and re-run — no code changes. For automated
Seller-Central sync, the Amazon SP-API is the official route; it needs
server-side credentials (LWA client id/secret, refresh token, an app registered
in Seller Central, a role) that must never live in frontend code. Not required
for this one-time import.
