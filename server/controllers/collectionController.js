import { Collection, slugifyCollectionName } from "../models/Collection.js";
import { Product } from "../models/Product.js";
import { escapeRegExp } from "../utils/escapeRegExp.js";

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

// For customers: a collection without its own cover shows one of its designs'
// photos instead of an "Image unavailable" placeholder. (The admin still sees
// that no cover is set.)
const serializePublic = (row, stats = {}) => {
  const plain = serialize(row, stats);
  return { ...plain, coverImage: plain.coverImage || stats.cover || "" };
};

// Design counts and lowest prices per collection, in one aggregate.
const statsByCollection = async (match) => {
  const rows = await Product.aggregate([
    { $match: { collectionId: { $nin: ["", null] }, ...match } },
    {
      $group: {
        _id: "$collectionId",
        count: { $sum: 1 },
        minPrice: { $min: "$price" },
        cover: { $first: { $arrayElemAt: ["$images", 0] } },
      },
    },
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
      .map((row) => serializePublic(row, stats.get(row.id)))
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
    return res.json({ collection: serializePublic(row, stats.get(row.id)) });
  } catch (error) {
    return next(error);
  }
};

// ── Manage a collection's designs in bulk ────────────────────────────────

const idList = (value) =>
  Array.isArray(value) ? [...new Set(value.map((id) => String(id).trim()).filter(Boolean))] : [];

/**
 * Bulk changes to the designs in one collection, from the Collections page:
 *   add      – product ids to put in this collection (moved from any other)
 *   remove   – product ids to take out (they become standalone products)
 *   publish  – product ids in this collection to set active ("on the shop")
 *   category – set every design in the collection to this category, so the
 *              collection and its designs are listed in the same place
 * Any combination may be sent; each only touches what it names.
 */
export const updateCollectionDesigns = async (req, res, next) => {
  try {
    const collection = await Collection.findOne({ id: req.params.id });
    if (!collection) return res.status(404).json({ message: "Collection not found." });

    const body = req.body || {};
    const add = idList(body.add);
    const remove = idList(body.remove);
    const publish = idList(body.publish);
    const category = typeof body.category === "string" ? body.category.trim() : "";
    if (body.category !== undefined && !category) {
      return res.status(400).json({
        message: "Please correct the fields.",
        errors: { category: "Pick a category." },
      });
    }

    if (add.length > 0) {
      const found = await Product.countDocuments({ id: { $in: add } });
      if (found !== add.length) {
        return res.status(400).json({
          message: "Please correct the fields.",
          errors: {
            add: "Some of those products no longer exist. Refresh and try again.",
          },
        });
      }
    }

    const inThis = { collectionId: collection.id };
    const changed = { added: 0, removed: 0, published: 0, recategorized: 0 };
    if (add.length > 0) {
      changed.added = (await Product.updateMany({ id: { $in: add } }, { $set: inThis })).modifiedCount;
    }
    if (remove.length > 0) {
      changed.removed = (
        await Product.updateMany({ id: { $in: remove }, ...inThis }, { $set: { collectionId: "" } })
      ).modifiedCount;
    }
    if (publish.length > 0) {
      changed.published = (
        await Product.updateMany(
          { id: { $in: publish }, ...inThis, status: { $ne: "active" } },
          { $set: { status: "active" } },
        )
      ).modifiedCount;
    }
    if (category) {
      changed.recategorized = (
        await Product.updateMany({ ...inThis, category: { $ne: category } }, { $set: { category } })
      ).modifiedCount;
    }

    const stats = await statsByCollection({ collectionId: collection.id });
    return res.json({
      collection: serialize(collection, stats.get(collection.id)),
      changed,
    });
  } catch (error) {
    return next(error);
  }
};

// ── Turn a product into a collection ─────────────────────────────────────

/**
 * Makes a collection out of an existing product (same name, description,
 * category, first photo as cover) and keeps the product inside it as the
 * first design, still on sale at the same URL. Used from the product form.
 */
export const makeProductCollection = async (req, res, next) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ message: "Product not found." });

    if (product.collectionId) {
      return res.status(409).json({ message: "This product is already in a collection." });
    }

    const name = product.name.trim();
    const clash = await Collection.exists({
      $or: [{ name: new RegExp(`^${escapeRegExp(name)}$`, "i") }, { slug: slugifyCollectionName(name) }],
    });
    if (clash) {
      return res.status(409).json({
        message: `A collection named "${name}" already exists. Pick it from the Collection list instead.`,
      });
    }

    const collection = await Collection.create({
      name,
      slug: slugifyCollectionName(name),
      description: product.description || "",
      coverImage: product.images?.[0] || "",
      category: product.category,
      status: product.status === "active" ? "active" : "draft",
    });

    try {
      product.collectionId = collection.id;
      await product.save();
    } catch (error) {
      // Never leave an empty collection behind a failed move.
      await collection.deleteOne();
      throw error;
    }

    const stats = await statsByCollection({ collectionId: collection.id });
    return res.status(201).json({
      collection: serialize(collection, stats.get(collection.id)),
      product: product.toObject(),
    });
  } catch (error) {
    const errors = validationErrors(error);
    if (errors) return res.status(400).json({ message: "Please correct the fields.", errors });
    return next(error);
  }
};

// ── Retire a product into its collection ─────────────────────────────────

/**
 * Hides a product that a collection now stands for (typically the product the
 * collection was made from): archives it, so it leaves every listing, and
 * records it on the collection so its old link redirects there (see
 * utils/spaRoutes.js). Nothing is deleted, so past orders keep their product.
 * If the collection has no cover yet, the product's first photo becomes it.
 */
export const retireProductIntoCollection = async (req, res, next) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (!product.collectionId) {
      return res.status(409).json({ message: "This product isn't in a collection." });
    }
    const collection = await Collection.findOne({ id: product.collectionId });
    if (!collection) {
      return res.status(409).json({ message: "This product's collection no longer exists." });
    }

    product.status = "archived";
    await product.save();

    if (!collection.legacyProductIds.includes(product.id)) {
      collection.legacyProductIds = [...collection.legacyProductIds, product.id];
    }
    if (!collection.coverImage && product.images?.[0]) {
      collection.coverImage = product.images[0];
    }
    await collection.save();

    const stats = await statsByCollection({ collectionId: collection.id });
    return res.json({ product: product.toObject(), collection: serialize(collection, stats.get(collection.id)) });
  } catch (error) {
    return next(error);
  }
};
