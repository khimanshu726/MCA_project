import { useCallback, useMemo } from "react";
import { useUserAuth } from "../context/UserAuthContext";
import { useCart as useGuestCart } from "../context/CartContext";
import { useServerCart } from "./useServerCart";
import { useProducts } from "./useProducts";
import { computeClientCartPricing } from "../utils/pricing";

const LOW_STOCK_THRESHOLD = 5;

const buildGuestItems = (guestCartItems, liveProductsById) =>
  guestCartItems.map((item) => {
    const liveProduct = liveProductsById.get(item.id);
    const isMissing = !liveProduct;
    // Mirrors the server's definition (server/controllers/cartController.js):
    // "out of stock" means stock can't satisfy the product's own minimum
    // order quantity, not just zero stock.
    const isOutOfStock =
      isMissing || liveProduct.stock <= 0 || liveProduct.stock < (liveProduct.minimumOrderQty || 1);
    const isLowStock = !isMissing && !isOutOfStock && liveProduct.stock <= LOW_STOCK_THRESHOLD;
    const isPriceChanged = !isMissing && Number(liveProduct.price) !== Number(item.price);

    const product = liveProduct || {
      id: item.id,
      name: item.name,
      price: item.price,
      mrp: item.price,
      discountPercent: 0,
      images: item.images,
      category: item.category,
      description: item.description,
      stock: 0,
      leadTime: "",
      minimumOrderQty: 1,
    };

    return {
      productId: item.id,
      quantity: item.quantity,
      savedForLater: false,
      priceAtAdd: item.price,
      product,
      isMissing,
      isOutOfStock,
      isLowStock,
      isPriceChanged,
      lineTotal: isMissing ? 0 : product.price * item.quantity,
    };
  });

const emptyPricing = computeClientCartPricing([]);

// Unified cart facade: guests are backed by the local reducer/localStorage
// (CartContext), logged-in users are backed by the server cart (React
// Query, see useServerCart). Both are normalized into the same item/pricing
// shape so consumers (CartPage, AddToCartButton, the header badge) don't
// need to know which mode they're in.
export function useCart() {
  const { isAuthenticated } = useUserAuth();
  const guest = useGuestCart();
  const server = useServerCart();

  const guestProductIds = useMemo(() => guest.cartItems.map((item) => item.id), [guest.cartItems]);

  const { data: liveGuestProductsData } = useProducts({
    ids: !isAuthenticated ? guestProductIds : [],
  });

  const liveProductsById = useMemo(() => {
    const map = new Map();
    (liveGuestProductsData?.items ?? []).forEach((product) => map.set(product.id, product));
    return map;
  }, [liveGuestProductsData]);

  const guestItems = useMemo(
    () => buildGuestItems(guest.cartItems, liveProductsById),
    [guest.cartItems, liveProductsById],
  );

  const guestPricing = useMemo(
    () =>
      computeClientCartPricing(
        guestItems
          .filter((item) => !item.isMissing && !item.isOutOfStock)
          .map((item) => ({ price: item.product.price, mrp: item.product.mrp, quantity: item.quantity })),
      ),
    [guestItems],
  );

  const serverItems = server.cart?.items ?? [];
  const items = isAuthenticated ? serverItems : guestItems;
  const pricing = isAuthenticated ? server.cart?.pricing ?? emptyPricing : guestPricing;

  const cartItemIds = useMemo(() => new Set(items.map((item) => item.productId)), [items]);

  const cartCount = useMemo(
    () => items.reduce((total, item) => (item.savedForLater ? total : total + item.quantity), 0),
    [items],
  );

  const addToCart = useCallback(
    async (product, quantity = 1) => {
      if (isAuthenticated) {
        await server.addItem({ productId: product.id, quantity, product });
        return;
      }
      guest.addToCart(product, quantity);
    },
    [isAuthenticated, server, guest],
  );

  const removeFromCart = useCallback(
    async (productId) => {
      if (isAuthenticated) {
        await server.removeItem(productId);
        return;
      }
      guest.removeFromCart(productId);
    },
    [isAuthenticated, server, guest],
  );

  const updateQuantity = useCallback(
    async (productId, quantity) => {
      if (isAuthenticated) {
        await server.setQuantity({ productId, quantity });
        return;
      }
      guest.updateQuantity(productId, quantity);
    },
    [isAuthenticated, server, guest],
  );

  const toggleSaveForLater = useCallback(
    async (productId, savedForLater) => {
      // Save-for-later is a server-cart feature; guests don't have a second
      // persistence tier below localStorage, so this is a no-op until login.
      if (isAuthenticated) {
        await server.setSavedForLater({ productId, savedForLater });
      }
    },
    [isAuthenticated, server],
  );

  const clearCart = useCallback(async () => {
    if (isAuthenticated) {
      await server.clear();
      return;
    }
    guest.clearCart();
  }, [isAuthenticated, server, guest]);

  // Coupons only work against the authenticated server cart — same reason
  // save-for-later is authenticated-only. The UI shows a "log in to apply a
  // coupon" prompt instead of calling this for guests.
  const applyCoupon = useCallback(
    (code) => {
      if (!isAuthenticated) {
        return Promise.reject(new Error("Log in to apply a coupon."));
      }
      return server.applyCoupon(code);
    },
    [isAuthenticated, server],
  );

  const removeCoupon = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve();
    return server.removeCoupon();
  }, [isAuthenticated, server]);

  // Backward-compatible flat shape for call sites that only need id/name/price.
  const cartItems = useMemo(
    () =>
      items.map((item) => ({
        id: item.productId,
        name: item.product?.name,
        price: item.product?.price,
        category: item.product?.category,
        description: item.product?.description,
        images: item.product?.images,
        quantity: item.quantity,
      })),
    [items],
  );

  return {
    items,
    cartItems,
    cartItemIds,
    cartCount,
    pricing,
    couponError: isAuthenticated ? server.cart?.couponError ?? null : null,
    isLoading: isAuthenticated ? server.isLoading : false,
    isApplyingCoupon: isAuthenticated ? server.isApplyingCoupon : false,
    isAuthenticated,
    addToCart,
    removeFromCart,
    updateQuantity,
    toggleSaveForLater,
    clearCart,
    applyCoupon,
    removeCoupon,
  };
}
