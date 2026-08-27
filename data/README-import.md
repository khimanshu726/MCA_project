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

## Images (pending)

The Active Listings Report's `image-url` column was blank, so every product ships
with `images: []`. **The importer skips any product whose `images` is empty** —
this is expected, not an error, and it keeps the model's "at least one image"
rule satisfied. To add images:

1. Add the image URLs to each product's `images` array in the JSON (upload the
   photos to Cloudinary first, or via the Admin panel's uploader, so the site
   owns them and `ResponsiveImage` can optimise them). Do **not** hot-link
   Amazon URLs.
2. Re-run the importer.

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
