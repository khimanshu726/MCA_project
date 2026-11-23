import mongoose from "mongoose";
import { validatePriceTiers } from "../../src/utils/tierPricing.js";

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// An admin-defined selectable attribute — e.g. { label: "Paper type",
// values: ["70gsm", "80gsm"] }. Purely descriptive: options record a customer's
// spec choice on a quote and never affect price or stock. `_id: false` keeps the
// serialized shape flat (label + values only).
const productOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    values: { type: [String], default: [] },
  },
  { _id: false },
);

// Volume pricing: from `minQty` units up, each unit costs `price` (see
// src/utils/tierPricing.js). Empty means the base price applies at any quantity.
const priceTierSchema = new mongoose.Schema(
  {
    minQty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, index: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one product image is required.",
      },
    },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, default: "" },
    // The Amazon ASIN this product was imported from, kept so the row can be
    // traced back to (and re-synced with) its Seller-Central listing. Optional
    // — products created in the admin without an Amazon origin simply omit it.
    asin: { type: String, default: "" },
    status: { type: String, enum: ["active", "draft", "archived"], default: "draft" },
    leadTime: { type: String, default: "" },
    minimumOrderQty: { type: Number, default: 1, min: 1 },
    // Sold in lots of this many from the minimum (50 → 100, 150, 200…).
    quantityStep: { type: Number, default: 1, min: 1 },
    priceTiers: { type: [priceTierSchema], default: [] },
    // HSN/SAC code (HsnCode.code). The GST rate is always read from that row,
    // never stored here. Empty until the owner assigns one.
    hsnCode: { type: String, default: "", trim: true },
    // Collection this product is a design in (Collection.id), e.g. one wedding
    // card inside "Wedding Invitation Suite". Empty = a standalone product.
    collectionId: { type: String, default: "", trim: true, index: true },
    // The design's type within its collection ("Royal", "Floral"), used for
    // the collection page's filter chips. Free text.
    designType: { type: String, default: "", trim: true },
    badge: { type: String, default: "" },
    materials: { type: [String], default: [] },
    options: { type: [productOptionSchema], default: [] },
    audience: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    source: {
      type: String,
      enum: ["data-js-seed", "admin-json-seed", "admin", "migration"],
      default: "admin",
    },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, status: 1 });
productSchema.index({ featured: 1, status: 1 });

productSchema.pre("validate", function assignSlugAndValidatePrice() {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  if (typeof this.price === "number" && typeof this.mrp === "number" && this.price > this.mrp) {
    this.invalidate("price", "Price cannot be greater than MRP.");
  }

  // Checked against the product's own price and minimum order on every save,
  // so a later edit to just the base price can't leave a tier priced above it.
  const { tiers, errors } = validatePriceTiers(
    (this.priceTiers || []).map((tier) => ({ minQty: tier.minQty, price: tier.price })),
    { price: this.price, minimumOrderQty: this.minimumOrderQty },
  );
  if (errors.length > 0) {
    this.invalidate("priceTiers", errors.join(" "));
  } else if (tiers.length > 0) {
    this.priceTiers = tiers; // store sorted by quantity
  }
});

export const Product = mongoose.model("Product", productSchema);
