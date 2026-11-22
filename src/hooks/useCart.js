import { useCallback, useMemo } from "react";
import { useUserAuth } from "../context/UserAuthContext";
import { useCart as useGuestCart } from "../context/CartContext";
import { useServerCart } from "./useServerCart";
import { useProducts } from "./useProducts";
import { computeClientCartPricing } from "../utils/pricing";
import { isProductLowStock, isProductOutOfStock } from "../utils/productAvailability";
import { getUnitPrice } from "../utils/tierPricing";

// The cart line's own snapshot, saved when it was added. Used when there is no
// live product to show (yet, or any more).
const snapshotProduct = (item, { stock }) => ({
  id: item.id,
  name: item.name,
  price: item.price,
  mrp: item.price,
  discountPercent: 0,
  images: item.images,
  category: item.category,
  description: item.description,
  stock,
  leadTime: "",
  // Not saved with the cart line; left empty so no made-up "MOQ 1" badge shows.
  minimumOrderQty: null,
});

// `hasFreshCatalog` = the live products for exactly these cart ids have loaded.
// Only then does "not in the response" mean "removed from the catalog". Before
// that — first load, a refetch after the ids changed (React Query keeps the
// previous result as placeholder data), or the API being unreachable — an
// absent product is simply not known yet, so the line shows its saved details
// instead of "This product is no longer available" and a ₹0 total.
const buildGuestItems = (guestCartItems, liveProductsById, hasFreshCatalog) =>
  guestCartItems.map((item) => {
    const liveProduct = liveProductsById.get(item.id);

    if (!liveProduct) {
      const isMissing = hasFreshCatalog;
      return {
        productId: item.id,
        quantity: item.quantity,
        savedForLater: false,
        priceAtAdd: item.price,
        product: snapshotProduct(item, { stock: isMissing ? 0 : item.quantity }),
        isMissing,
        isAvailabilityUnknown: !isMissing,
        isOutOfStock: isMissing,
        isLowStock: false,
        isPriceChanged: false,
        unitPrice: item.price,
        lineTotal: isMissing ? 0 : item.price * item.quantity,
      };
    }

    // Same module the server uses (cartController.js), so guest and server
    // carts can never disagree about what's buyable.
    const isOutOfStock = isProductOutOfStock(liveProduct);

    return {
      productId: item.id,
      quantity: item.quantity,
      savedForLater: false,
      priceAtAdd: item.price,
      product: liveProduct,
      isMissing: false,
      isAvailabilityUnknown: false,
      isOutOfStock,
      isLowStock: isProductLowStock(liveProduct),
      isPriceChanged: Number(liveProduct.price) !== Number(item.price),
      // Volume pricing: the unit price depends on the quantity.
      unitPrice: getUnitPrice(liveProduct, item.quantity),
      lineTotal: getUnitPrice(liveProduct, item.quantity) * item.quantity,
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

  const {
    data: liveGuestProductsData,
    isPlaceholderData: isGuestCatalogPlaceholder,
    isError: isGuestCatalogError,
  } = useProducts({
    ids: !isAuthenticated ? guestProductIds : [],
  });

  const liveProductsById = useMemo(() => {
    const map = new Map();
    (liveGuestProductsData?.items ?? []).forEach((product) => map.set(product.id, product));
    return map;
  }, [liveGuestProductsData]);

  const hasFreshGuestCatalog = Boolean(liveGuestProductsData) && !isGuestCatalogPlaceholder;

  // Nothing to show yet for a non-empty guest cart: let the page render its
  // skeleton rather than lines and totals that are about to change. Stops
  // waiting if the request fails, so the cart never spins forever.
  const isGuestCartLoading =
    !isAuthenticated && guest.cartItems.length > 0 && !liveGuestProductsData && !isGuestCatalogError;

  const guestItems = useMemo(
    () => buildGuestItems(guest.cartItems, liveProductsById, hasFreshGuestCatalog),
    [guest.cartItems, liveProductsById, hasFreshGuestCatalog],
  );

  const guestPricing = useMemo(
    () =>
      computeClientCartPricing(
        guestItems
          .filter((item) => !item.isMissing && !item.isOutOfStock)
          .map((item) => ({ price: item.unitPrice, mrp: item.product.mrp, quantity: item.quantity })),
      ),
    [guestItems],
  );

  const serverItems = server.cart?.items ?? [];
  const items = isAuthenticated ? serverItems : guestItems;
  const pricing = isAuthenticated ? server.cart?.pricing ?? emptyPricing : guestPricing;

  const cartItemIds = useMemo(() => new Set(items.map((item) => item.productId)), [items]);

  // The header badge counts what you can actually buy. It used to count every
  // line regardless, so an unbuyable product showed "250" in the badge next to
  // "0 items / ₹0" in the summary — and the badge is what customers see first.
  //
  // Excludes only lines we have positive evidence are unbuyable, i.e. the live
  // product loaded and its stock can't meet its MOQ. A line whose product was
  // removed from the catalog (`isMissing`) still counts, so the badge matches
  // the line the customer will find in the cart and can remove.
  //
  // It counts products (cart lines), not units: print quantities run to the
  // hundreds, so 100 visiting cards made the badge read "100", which looks
  // like a hundred things in the cart. One line = one, matching the cart
  // page's "N items".
  const cartCount = useMemo(
    () =>
      items.filter((item) => !item.savedForLater && (item.isMissing || !item.isOutOfStock)).length,
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
        // The unit price for this quantity (volume pricing), which is what the
        // checkout review shows and the server charges.
        price: item.unitPrice ?? item.product?.price,
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
    isLoading: isAuthenticated ? server.isLoading : isGuestCartLoading,
    isApplyingCoupon: isAuthenticated ? server.isApplyingCoupon : false,
    pendingQuantityProductId: isAuthenticated ? server.pendingQuantityProductId : null,
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
