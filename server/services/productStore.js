import crypto from "node:crypto";
import { Product } from "../models/Product.js";

// The only fields an admin edit may write. `id`, `slug`, `source`, and the
// timestamps are deliberately absent: id/slug are identity, source records how
// the row was born, and letting an update set any of them would let the
// product-management UI corrupt data the rest of the system trusts.
export const EDITABLE_PRODUCT_FIELDS = [
  "name",
  "description",
  "category",
  "images",
  "price",
  "mrp",
  "stock",
  "sku",
  "status",
  "leadTime",
  "minimumOrderQty",
  "badge",
  "materials",
  "audience",
  "featured",
];

const computeDiscountPercent = (price, mrp) => {
  if (!mrp || mrp <= price) {
    return 0;
  }

  return Math.round(((mrp - price) / mrp) * 100);
};

export const serializeProduct = (product) => {
  const plain = typeof product.toObject === "function" ? product.toObject() : product;

  return {
    ...plain,
    discountPercent: computeDiscountPercent(plain.price, plain.mrp),
  };
};

export const listProducts = async ({
  category,
  q,
  status,
  featured,
  ids,
  page = 1,
  limit = 24,
  sort = "-createdAt",
  includeInactive = false,
} = {}) => {
  const filter = {};

  if (!includeInactive) {
    filter.status = "active";
  } else if (status) {
    filter.status = status;
  }

  if (category && category !== "All") {
    filter.category = category;
  }

  if (typeof featured === "boolean") {
    filter.featured = featured;
  }

  if (Array.isArray(ids) && ids.length > 0) {
    filter.id = { $in: ids };
  }

  if (q) {
    filter.$or = [
      { name: new RegExp(q, "i") },
      { description: new RegExp(q, "i") },
      { category: new RegExp(q, "i") },
    ];
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Product.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeProduct),
    total,
    page: safePage,
    limit: safeLimit,
  };
};

export const getProductById = async (id) => {
  const product = await Product.findOne({ id });
  return product ? serializeProduct(product) : null;
};

export const getProductsByIds = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const products = await Product.find({ id: { $in: ids } });
  return products.map(serializeProduct);
};

export const createProductRecord = async (payload) => {
  const product = new Product({
    id: payload.id || crypto.randomUUID(),
    name: payload.name?.trim(),
    description: payload.description?.trim(),
    category: payload.category?.trim(),
    images: payload.images,
    price: Number(payload.price),
    mrp: Number(payload.mrp ?? payload.price),
    stock: Number(payload.stock ?? 0),
    sku: payload.sku || "",
    status: payload.status || "draft",
    leadTime: payload.leadTime || "",
    minimumOrderQty: Number(payload.minimumOrderQty) || 1,
    badge: payload.badge || "",
    materials: payload.materials || [],
    audience: payload.audience || "",
    featured: Boolean(payload.featured),
    source: payload.source || "admin",
  });

  await product.save();
  return serializeProduct(product);
};

export const updateProductRecord = async (id, updates) => {
  const product = await Product.findOne({ id });

  if (!product) {
    return null;
  }

  // Whitelist, then save() rather than findOneAndUpdate so the schema's
  // pre('validate') hook runs — that's where the slug is (re)assigned and the
  // price ≤ mrp rule is enforced; both are skipped by findOneAndUpdate.
  for (const key of EDITABLE_PRODUCT_FIELDS) {
    if (updates[key] !== undefined) {
      product[key] = updates[key];
    }
  }

  await product.save();
  return serializeProduct(product);
};

export const deleteProductRecord = async (id) => {
  const result = await Product.findOneAndDelete({ id });
  return !!result;
};

// Atomic, race-condition-safe stock decrement: the `stock: { $gte: quantity }`
// filter is evaluated by MongoDB at the document level, so two concurrent
// requests racing for the last unit of stock cannot both succeed.
export const decrementStockAtomic = async (id, quantity) => {
  const product = await Product.findOneAndUpdate(
    { id, status: "active", stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true },
  );

  return product ? serializeProduct(product) : null;
};

export const restoreStock = async (id, quantity) => {
  const product = await Product.findOneAndUpdate({ id }, { $inc: { stock: quantity } }, { new: true });
  return product ? serializeProduct(product) : null;
};
