import mongoose from "mongoose";

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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
    status: { type: String, enum: ["active", "draft", "archived"], default: "draft" },
    leadTime: { type: String, default: "" },
    minimumOrderQty: { type: Number, default: 1, min: 1 },
    badge: { type: String, default: "" },
    materials: { type: [String], default: [] },
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
});

export const Product = mongoose.model("Product", productSchema);
