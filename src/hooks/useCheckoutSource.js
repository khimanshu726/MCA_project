import { useMemo } from "react";
import { useCart } from "./useCart";
import { useBuyNowSource } from "./useBuyNowSource";

export const CHECKOUT_SOURCE_CART = "cart";
export const CHECKOUT_SOURCE_BUY_NOW = "buynow";

/**
 * The one seam between "what am I buying" and "how do I buy it".
 *
 * Checkout has exactly two sources — the cart, and a single-item Buy Now — and
 * everything downstream of item selection (address, coupon, payment, order
 * creation, success) is identical for both. So rather than forking the
 * checkout, both sources are normalized to one shape here and the checkout
 * pages consume that shape without knowing which they're in.
 *
 * Worth noting for anyone extending this: the *server* needs no equivalent
 * switch. POST /create-order already takes explicit line items and resolves
 * price, stock and coupon against live records itself — it never reads the
 * cart. A `source` field on the order payload would be inert, and orders from
 * both paths are therefore identical by construction rather than by
 * convention, which is what the "no distinction in order history" requirement
 * actually needs.
 *
 * Precedence: an active Buy Now session wins. It's the more recent, more
 * specific intent, and it only exists because the customer clicked Buy Now on
 * their way to this exact page.
 */
export function useCheckoutSource() {
  const cart = useCart();
  const buyNow = useBuyNowSource();

  const isBuyNow = buyNow.hasSession && !buyNow.isExpired;

  return useMemo(() => {
    if (isBuyNow) {
      return {
        source: CHECKOUT_SOURCE_BUY_NOW,
        isBuyNow: true,
        items: buyNow.items,
        cartItems: buyNow.cartItems,
        pricing: buyNow.pricing,
        isLoading: buyNow.isLoading,
        isAuthenticated: cart.isAuthenticated,

        couponError: buyNow.couponError,
        isApplyingCoupon: buyNow.isApplyingCoupon,
        applyCoupon: buyNow.applyCoupon,
        removeCoupon: buyNow.removeCoupon,

        // Consumed on a completed order. For Buy Now this drops the session;
        // it deliberately does NOT touch the cart, which is the whole point of
        // the feature.
        clearSource: buyNow.clearSource,

        // Where an empty/invalid source should send the customer back to.
        emptyRedirect: "/products",

        quantity: buyNow.quantity,
        setQuantity: buyNow.setQuantity,
        minQuantity: buyNow.minQuantity,
        maxQuantity: buyNow.maxQuantity,
        isEditableQuantity: true,

        isMissing: buyNow.isMissing,
        isOutOfStock: buyNow.isOutOfStock,
        exceedsStock: buyNow.exceedsStock,
        priceChanged: buyNow.priceChanged,
        isExpired: false,
        customization: buyNow.customization,
      };
    }

    const activeItems = cart.items.filter((item) => !item.savedForLater);

    return {
      source: CHECKOUT_SOURCE_CART,
      isBuyNow: false,
      items: activeItems,
      cartItems: cart.cartItems,
      pricing: cart.pricing,
      isLoading: cart.isLoading,
      isAuthenticated: cart.isAuthenticated,

      couponError: cart.couponError,
      isApplyingCoupon: cart.isApplyingCoupon,
      applyCoupon: cart.applyCoupon,
      removeCoupon: cart.removeCoupon,

      clearSource: cart.clearCart,
      emptyRedirect: "/cart",

      // Cart quantities are edited on the cart page, not in checkout.
      quantity: null,
      setQuantity: null,
      minQuantity: 1,
      maxQuantity: null,
      isEditableQuantity: false,

      isMissing: false,
      isOutOfStock: false,
      exceedsStock: false,
      priceChanged: false,
      // A Buy Now session that timed out while the customer sat on checkout.
      // Reported even on the cart branch so the UI can explain the fallback
      // instead of appearing to lose the purchase.
      isExpired: buyNow.isExpired,
      customization: null,
    };
  }, [isBuyNow, buyNow, cart]);
}
