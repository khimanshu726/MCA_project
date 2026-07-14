import { getProductsByIds } from "../services/productStore.js";
import { computeCartPricing } from "../services/pricingService.js";
import { findCouponByCode, validateCoupon } from "../services/couponStore.js";
import {
  addItem,
  clearCart,
  getOrCreateCart,
  removeItem,
  replaceItems,
  setAppliedCoupon,
  setItemQuantity,
  setSavedForLater,
} from "../services/cartStore.js";

const LOW_STOCK_THRESHOLD = 5;

const round2 = (value) => Math.round(value * 100) / 100;

// Cart items only ever store a productId + quantity; every read re-resolves
// against the live Product so price/stock can never drift silently.
const resolveCartView = async (cart) => {
  const productIds = [...new Set(cart.items.map((item) => item.productId))];
  const products = await getProductsByIds(productIds);
  const productsById = new Map(products.map((product) => [product.id, product]));

  const items = cart.items.map((item) => {
    const product = productsById.get(item.productId) || null;
    const isMissing = !product || product.status !== "active";
    // "Out of stock" means stock can't even satisfy the product's own
    // minimum order quantity — not just zero stock, and independent of
    // whatever quantity happens to be sitting in this cart line (that's
    // recoverable by lowering the quantity; this isn't).
    const isOutOfStock = isMissing || product.stock <= 0 || product.stock < (product.minimumOrderQty || 1);
    const isLowStock = !isMissing && !isOutOfStock && product.stock <= LOW_STOCK_THRESHOLD;
    const isPriceChanged = !isMissing && Number(product.price) !== Number(item.priceAtAdd);

    return {
      productId: item.productId,
      quantity: item.quantity,
      savedForLater: item.savedForLater,
      addedAt: item.addedAt,
      priceAtAdd: item.priceAtAdd,
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
      isOutOfStock,
      isLowStock,
      isPriceChanged,
      lineTotal: isMissing ? 0 : round2(product.price * item.quantity),
    };
  });

  const eligibleForPricing = items.filter(
    (item) => !item.savedForLater && !item.isMissing && !item.isOutOfStock,
  );
  const pricingItems = eligibleForPricing.map((item) => ({
    price: item.product.price,
    mrp: item.product.mrp,
    quantity: item.quantity,
  }));
  const subtotal = pricingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Re-validate the applied coupon against the *current* subtotal on every
  // read — min-order/expiry/usage can all change between visits. If it's
  // gone invalid, clear it from the cart and explain why, rather than
  // silently keeping a stale discount or silently dropping it.
  let coupon = null;
  let couponError = null;

  if (cart.appliedCouponCode) {
    const candidate = await findCouponByCode(cart.appliedCouponCode);
    const validation = validateCoupon(candidate, subtotal);

    if (validation.valid) {
      coupon = candidate;
    } else {
      couponError = `Your coupon was removed: ${validation.reason}`;
      await setAppliedCoupon(cart.customerId, null);
    }
  }

  const pricing = computeCartPricing(pricingItems, coupon);

  return { items, pricing, couponError };
};

export const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.customer.id);
    const view = await resolveCartView(cart);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};

export const addCartItem = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const quantity = Math.max(1, Number(req.body.quantity) || 1);

    if (!productId) {
      return res.status(400).json({ message: "productId is required." });
    }

    const [product] = await getProductsByIds([productId]);

    if (!product || product.status !== "active") {
      return res.status(404).json({ message: "Product not found." });
    }

    if (product.stock < quantity) {
      return res.status(409).json({
        code: "OUT_OF_STOCK",
        message: "Not enough stock available.",
        available: product.stock,
      });
    }

    const cart = await addItem(req.customer.id, { productId, quantity, priceAtAdd: product.price });
    const view = await resolveCartView(cart);
    return res.status(201).json(view);
  } catch (error) {
    return next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const quantity = Math.max(1, Number(req.body.quantity) || 1);

    const [product] = await getProductsByIds([productId]);

    if (product && product.stock < quantity) {
      return res.status(409).json({
        code: "OUT_OF_STOCK",
        message: "Not enough stock available.",
        available: product.stock,
      });
    }

    const cart = await setItemQuantity(req.customer.id, productId, quantity, product?.price);

    if (!cart) {
      return res.status(404).json({ message: "Item not found in cart." });
    }

    const view = await resolveCartView(cart);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    const cart = await removeItem(req.customer.id, req.params.productId);
    const view = await resolveCartView(cart);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};

export const toggleSaveForLater = async (req, res, next) => {
  try {
    const savedForLater = Boolean(req.body.savedForLater);
    const cart = await setSavedForLater(req.customer.id, req.params.productId, savedForLater);

    if (!cart) {
      return res.status(404).json({ message: "Item not found in cart." });
    }

    const view = await resolveCartView(cart);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};

export const applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "A coupon code is required." });
    }

    const cart = await getOrCreateCart(req.customer.id);
    const activeItems = cart.items.filter((item) => !item.savedForLater);
    const products = await getProductsByIds(activeItems.map((item) => item.productId));
    const productsById = new Map(products.map((product) => [product.id, product]));
    const subtotal = activeItems.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      if (!product || product.status !== "active" || product.stock <= 0) return sum;
      return sum + product.price * item.quantity;
    }, 0);

    const coupon = await findCouponByCode(code);
    const validation = validateCoupon(coupon, subtotal);

    if (!validation.valid) {
      return res.status(400).json({ code: "COUPON_INVALID", message: validation.reason });
    }

    const updatedCart = await setAppliedCoupon(req.customer.id, coupon.code);
    const view = await resolveCartView(updatedCart);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};

export const removeCoupon = async (req, res, next) => {
  try {
    const cart = await setAppliedCoupon(req.customer.id, null);
    const view = await resolveCartView(cart);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};

export const clearCartItems = async (req, res, next) => {
  try {
    const cart = await clearCart(req.customer.id);
    const view = await resolveCartView(cart);
    return res.json(view);
  } catch (error) {
    return next(error);
  }
};

// Merge strategy: sum guest + server quantities for matching products,
// clamped to live stock. Reports any clamped lines so the client can
// surface "quantity was reduced to match available stock".
export const mergeCart = async (req, res, next) => {
  try {
    const guestItems = Array.isArray(req.body.items) ? req.body.items : [];
    const existingCart = await getOrCreateCart(req.customer.id);

    const productIds = [...new Set(guestItems.map((item) => item.productId))];
    const products = await getProductsByIds(productIds);
    const productsById = new Map(products.map((product) => [product.id, product]));

    const mergedItems = existingCart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      priceAtAdd: item.priceAtAdd,
      savedForLater: item.savedForLater,
      addedAt: item.addedAt,
    }));

    const clamped = [];

    for (const guestItem of guestItems) {
      const product = productsById.get(guestItem.productId);

      if (!product || product.status !== "active") {
        continue;
      }

      const existing = mergedItems.find((item) => item.productId === guestItem.productId);
      const guestQty = Math.max(1, Number(guestItem.quantity) || 1);
      const serverQty = existing ? existing.quantity : 0;
      const requestedQuantity = serverQty + guestQty;
      const finalQuantity = Math.min(requestedQuantity, product.stock);

      if (finalQuantity < requestedQuantity) {
        clamped.push({ productId: guestItem.productId, requestedQuantity, finalQuantity });
      }

      if (finalQuantity <= 0) {
        continue;
      }

      if (existing) {
        existing.quantity = finalQuantity;
        existing.priceAtAdd = product.price;
      } else {
        mergedItems.push({
          productId: guestItem.productId,
          quantity: finalQuantity,
          priceAtAdd: product.price,
          savedForLater: false,
          addedAt: new Date(),
        });
      }
    }

    const cart = await replaceItems(req.customer.id, mergedItems);
    const view = await resolveCartView(cart);

    return res.json({ ...view, clamped });
  } catch (error) {
    return next(error);
  }
};
