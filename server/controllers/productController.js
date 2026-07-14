import { getProductById, listProducts } from "../services/productStore.js";

const parseBoolean = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

export const getProducts = async (req, res, next) => {
  try {
    const { category, q, sort, page, limit, featured, ids } = req.query;
    const idList = typeof ids === "string" ? ids.split(",").map((id) => id.trim()).filter(Boolean) : undefined;

    const result = await listProducts({
      category,
      q,
      sort,
      page,
      limit: limit || idList?.length,
      featured: parseBoolean(featured),
      ids: idList,
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

    return res.json({ product });
  } catch (error) {
    return next(error);
  }
};
