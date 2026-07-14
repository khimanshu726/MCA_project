import { getProductsByIds } from "../services/productStore.js";
import { addItem, clearWishlist, getOrCreateWishlist, removeItem } from "../services/wishlistStore.js";

// A wishlist item just re-resolves against the live Product on every read —
// same pattern as the cart, but there's nothing to block on (a sold-out
// item just shows a badge; it isn't excluded from anything).
const resolveWishlistView = async (wishlist) => {
  const productIds = [...new Set(wishlist.items.map((item) => item.productId))];
  const products = await getProductsByIds(productIds);
  const productsById = new Map(products.map((product) => [product.id, product]));

  const items = wishlist.items.map((item) => {
    const product = productsById.get(item.productId) || null;
    const isMissing = !product || product.status !== "active";

    return {
      productId: item.productId,
      addedAt: item.addedAt,
      product: isMissing
        ? null
        : {
            id: product.id,
            name: product.name,
            images: product.images,
            category: product.category,
            price: product.price,
            mrp: product.mrp,
            discountPercent: product.discountPercent,
            stock: product.stock,
            leadTime: product.leadTime,
            minimumOrderQty: product.minimumOrderQty,
          },
      isMissing,
      isOutOfStock: !isMissing && product.stock <= 0,
    };
  });

  return { items };
};

export const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await getOrCreateWishlist(req.customer.id);
    const view = await resolveWishlistView(wishlist);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};

export const addWishlistItem = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId is required." });
    }

    const [product] = await getProductsByIds([productId]);

    if (!product || product.status !== "active") {
      return res.status(404).json({ message: "Product not found." });
    }

    const wishlist = await addItem(req.customer.id, productId);
    const view = await resolveWishlistView(wishlist);
    return res.status(201).json(view);
  } catch (error) {
    return next(error);
  }
};

export const removeWishlistItem = async (req, res, next) => {
  try {
    const wishlist = await removeItem(req.customer.id, req.params.productId);
    const view = await resolveWishlistView(wishlist);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};

export const clearWishlistItems = async (req, res, next) => {
  try {
    const wishlist = await clearWishlist(req.customer.id);
    const view = await resolveWishlistView(wishlist);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};
