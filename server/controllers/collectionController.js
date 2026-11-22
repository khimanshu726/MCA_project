import { Collection, slugifyCollectionName } from "../models/Collection.js";
import { Product } from "../models/Product.js";

const EDITABLE_FIELDS = ["name", "description", "coverImage", "category", "status", "legacyProductIds"];

const pick = (body) =>
  Object.fromEntries(EDITABLE_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

const normalizeIds = (value) =>
  Array.isArray(value) ? [...new Set(value.map((id) => String(id).trim()).filter(Boolean))] : value;

const validationErrors = (error) => {
  if (error?.name === "ValidationError") {
    return Object.fromEntries(Object.entries(error.errors).map(([field, detail]) => [field, detail.message]));
  }
  if (error?.code === 11000) {
    return { name: "A collection with this name already exists." };
  }
  return null;
};

const serialize = (row, stats = {}) => ({
  ...(typeof row.toObject === "function" ? row.toObject() : row),
  productCount: stats.count || 0,
  minPrice: stats.minPrice ?? null,
});

// Design counts and lowest prices per collection, in one aggregate.
const statsByCollection = async (match) => {
  const rows = await Product.aggregate([
    { $match: { collectionId: { $nin: ["", null] }, ...match } },
    { $group: { _id: "$collectionId", count: { $sum: 1 }, minPrice: { $min: "$price" } } },
  ]);
  return new Map(rows.map((row) => [row._id, row]));
};

// ── Admin ────────────────────────────────────────────────────────────────

export const listAdminCollections = async (_req, res, next) => {
  try {
    const rows = await Collection.find().sort({ name: 1 });
    // Admin counts include drafts: the owner is building the collection up.
    const stats = await statsByCollection({});
    return res.json({ collections: rows.map((row) => serialize(row, stats.get(row.id))) });
  } catch (error) {
    return next(error);
  }
};

export const createAdminCollection = async (req, res, next) => {
  try {
    const fields = pick(req.body || {});
    if (fields.legacyProductIds !== undefined) fields.legacyProductIds = normalizeIds(fields.legacyProductIds);
    const row = await Collection.create({ ...fields, slug: slugifyCollectionName(fields.name) });
    return res.status(201).json({ collection: serialize(row) });
  } catch (error) {
    const errors = validationErrors(error);
    if (errors) return res.status(400).json({ message: "Please correct the fields.", errors });
    return next(error);
  }
};

export const updateAdminCollection = async (req, res, next) => {
  try {
    const row = await Collection.findOne({ id: req.params.id });
    if (!row) return res.status(404).json({ message: "Collection not found." });

    const fields = pick(req.body || {});
    if (fields.legacyProductIds !== undefined) fields.legacyProductIds = normalizeIds(fields.legacyProductIds);
    // The slug stays as first set, so links already shared keep working.
    Object.assign(row, fields);
    await row.save();
    const stats = await statsByCollection({ collectionId: row.id });
    return res.json({ collection: serialize(row, stats.get(row.id)) });
  } catch (error) {
    const errors = validationErrors(error);
    if (errors) return res.status(400).json({ message: "Please correct the fields.", errors });
    return next(error);
  }
};

export const deleteAdminCollection = async (req, res, next) => {
  try {
    const row = await Collection.findOne({ id: req.params.id });
    if (!row) return res.status(404).json({ message: "Collection not found." });

    const productCount = await Product.countDocuments({ collectionId: row.id });
    if (productCount > 0) {
      return res.status(409).json({
        message: `${productCount} product(s) are in this collection. Move them out or delete them first.`,
      });
    }
    await row.deleteOne();
    return res.json({ message: "Collection deleted." });
  } catch (error) {
    return next(error);
  }
};

// ── Storefront ───────────────────────────────────────────────────────────

export const listCollections = async (req, res, next) => {
  try {
    const filter = { status: "active" };
    const { category } = req.query;
    if (typeof category === "string" && category && category !== "All") {
      // Listed under its own category, and also under any category its designs
      // are in: designs are hidden from category listings in favour of the
      // collection card, so the card must show wherever they would have.
      const viaDesigns = await Product.distinct("collectionId", {
        category,
        status: "active",
        collectionId: { $nin: ["", null] },
      });
      filter.$or = [{ category }, { id: { $in: viaDesigns } }];
    }
    const rows = await Collection.find(filter).sort({ name: 1 });
    // Only what a customer can actually buy counts toward "N designs, from ₹x".
    const stats = await statsByCollection({ status: "active" });
    const collections = rows
      .map((row) => serialize(row, stats.get(row.id)))
      .filter((collection) => collection.productCount > 0);
    return res.json({ collections });
  } catch (error) {
    return next(error);
  }
};

export const getCollection = async (req, res, next) => {
  try {
    const row = await Collection.findOne({ slug: req.params.slug, status: "active" });
    if (!row) return res.status(404).json({ message: "Collection not found." });
    const stats = await statsByCollection({ status: "active", collectionId: row.id });
    return res.json({ collection: serialize(row, stats.get(row.id)) });
  } catch (error) {
    return next(error);
  }
};
