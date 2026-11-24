import crypto from "node:crypto";
import { Product } from "../models/Product.js";
import { Collection } from "../models/Collection.js";
import { nextProductCode } from "./productCodes.js";
import { escapeRegExp } from "../utils/escapeRegExp.js";

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
  "asin",
  "status",
  "leadTime",
  "minimumOrderQty",
  "quantityStep",
  "priceTiers",
  "hsnCode",
  "collectionId",
  "designType",
  "badge",
  "materials",
  "options",
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

// Shop listings show products the admin marked Featured first, newest first
// within each group. Only named orders are accepted: the sort used to be passed
// straight from the query string to Mongo.
const SORT_ORDERS = {
  featured: { featured: -1, createdAt: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
};
export const resolveProductSort = (sort) => SORT_ORDERS[sort] || SORT_ORDERS.featured;

export const listProducts = async ({
  category,
  q,
  status,
  featured,
  ids,
  collection,
  excludeCollected = false,
  withCollectionDesigns = false,
  categories,
  page = 1,
  limit = 24,
  sort = "featured",
  includeInactive = false,
} = {}) => {
  const filter = {};

  if (!includeInactive) {
    filter.status = "active";
  } else if (status) {
    filter.status = status;
  }

  // Conditions that each need their own $or (category with collection
  // designs, search) are combined here so neither overwrites the other.
  const allOf = [];

  // Several categories at once (a header category and the ones under it).
  const categoryList = Array.isArray(categories) && categories.length ? categories : null;
  if (categoryList) {
    if (withCollectionDesigns) {
      const collectionIds = await Collection.find({ category: { $in: categoryList }, status: "active" }).distinct("id");
      allOf.push({ $or: [{ category: { $in: categoryList } }, { collectionId: { $in: collectionIds } }] });
    } else {
      filter.category = { $in: categoryList };
    }
  } else if (category && category !== "All") {
    if (withCollectionDesigns) {
      // A category page lists every design of the collections shown under
      // it too, even a design still tagged with another category.
      const collectionIds = await Collection.find({ category, status: "active" }).distinct("id");
      allOf.push({ $or: [{ category }, { collectionId: { $in: collectionIds } }] });
    } else {
      filter.category = category;
    }
  }

  if (typeof featured === "boolean") {
    filter.featured = featured;
  }

  if (Array.isArray(ids) && ids.length > 0) {
    filter.id = { $in: ids };
  }

  if (collection) {
    filter.collectionId = collection;
  } else if (excludeCollected && !q && !withCollectionDesigns) {
    // The main catalogue shows a collection as one card instead of all of its
    // designs; a search still finds designs individually.
    filter.collectionId = { $in: ["", null] };
  }

  if (q) {
    // Escape the user input so it matches literally — an unescaped regex here is
    // a ReDoS vector (e.g. q="(a+)+$" hangs the event loop). Cap the length too,
    // so a giant literal can't produce a pathologically long pattern.
    const safe = escapeRegExp(String(q).slice(0, 100));
    allOf.push({
      $or: [
        { name: new RegExp(safe, "i") },
        { description: new RegExp(safe, "i") },
        { category: new RegExp(safe, "i") },
        { designType: new RegExp(safe, "i") },
        { code: new RegExp("^" + safe + "$", "i") },
      ],
    });
  }

  if (allOf.length === 1) {
    Object.assign(filter, allOf[0]);
  } else if (allOf.length > 1) {
    filter.$and = allOf;
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(resolveProductSort(sort))
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

const slugifyName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Slugs are unique, and duplicating a product twice gives two "X (copy)"s.
// Suffix -2, -3… instead of failing on the unique index.
const uniqueSlugFor = async (name) => {
  const base = slugifyName(name) || "product";
  let candidate = base;
  for (let n = 2; await Product.exists({ slug: candidate }); n += 1) {
    candidate = `${base}-${n}`;
  }
  return candidate;
};

export const createProductRecord = async (payload) => {
  const product = new Product({
    slug: await uniqueSlugFor(payload.name),
    id: payload.id || crypto.randomUUID(),
    code: await nextProductCode(),
    name: payload.name?.trim(),
    description: payload.description?.trim(),
    category: payload.category?.trim(),
    images: payload.images,
    price: Number(payload.price),
    mrp: Number(payload.mrp ?? payload.price),
    stock: Number(payload.stock ?? 0),
    sku: payload.sku || "",
    asin: payload.asin || "",
    status: payload.status || "draft",
    leadTime: payload.leadTime || "",
    minimumOrderQty: Number(payload.minimumOrderQty) || 1,
    quantityStep: Number(payload.quantityStep) || 1,
    priceTiers: Array.isArray(payload.priceTiers) ? payload.priceTiers : [],
    hsnCode: typeof payload.hsnCode === "string" ? payload.hsnCode.trim() : "",
    collectionId: typeof payload.collectionId === "string" ? payload.collectionId.trim() : "",
    designType: typeof payload.designType === "string" ? payload.designType.trim() : "",
    badge: payload.badge || "",
    materials: payload.materials || [],
    options: payload.options || [],
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
