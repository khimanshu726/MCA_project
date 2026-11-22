import crypto from "node:crypto";
import mongoose from "mongoose";

export const slugifyCollectionName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * A storefront collection: one page that groups many separate products, e.g.
 * "Wedding Invitation Suite" holding every wedding card design. Each design is
 * an ordinary product (own price, photos, stock, HSN) that points here through
 * `Product.collectionId`, so cart, checkout and orders need no changes.
 *
 * `id` is what products reference and never changes. `slug` is the public URL
 * (/collections/:slug); it is set from the name once and kept on rename so
 * shared links keep working.
 */
const collectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, default: () => crypto.randomUUID() },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "", trim: true },
    coverImage: { type: String, default: "", trim: true },
    // The storefront category whose listing shows this collection's card.
    category: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "draft"], default: "draft" },
    // Product ids whose old /products/:id URLs should lead here once retired,
    // e.g. the single "wedding-suite" product this collection replaces.
    legacyProductIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

collectionSchema.pre("validate", function setSlug() {
  if (!this.slug && this.name) {
    this.slug = slugifyCollectionName(this.name);
  }
});

export const Collection = mongoose.model("Collection", collectionSchema);
