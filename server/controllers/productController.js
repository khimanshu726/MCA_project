import { getProductById, listProducts } from "../services/productStore.js";
import { Collection } from "../models/Collection.js";
import { getFrequentlyBoughtTogether } from "../services/recommendationService.js";

const parseBoolean = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

export const getProducts = async (req, res, next) => {
  try {
    const { category, q, sort, page, limit, featured, ids, collection, excludeCollected } = req.query;
    const idList = typeof ids === "string" ? ids.split(",").map((id) => id.trim()).filter(Boolean) : undefined;

    const result = await listProducts({
      category,
      q,
      sort,
      page,
      limit: limit || idList?.length,
      featured: parseBoolean(featured),
      ids: idList,
      collection: typeof collection === "string" ? collection : undefined,
      excludeCollected: excludeCollected === "true",
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const getProductDetail = async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);

    if (!product || product.status !== "active") {
      return res.status(404).json({ message: "Product not found." });
    }

    // A design inside a live collection links back to it ("← Wedding
    // Invitation Suite") and offers its sibling designs.
    if (product.collectionId) {
      const collection = await Collection.findOne(
        { id: product.collectionId, status: "active" },
        { _id: 0, id: 1, name: 1, slug: 1 },
      ).lean();
      if (collection) {
        product.collection = collection;
      }
    }

    return res.json({ product });
  } catch (error) {
    return next(error);
  }
};

export const getFrequentlyBoughtTogetherHandler = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 10);
    const items = await getFrequentlyBoughtTogether(req.params.id, limit);
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
};
