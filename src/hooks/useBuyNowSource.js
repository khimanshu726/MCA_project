import { useCallback, useEffect, useMemo, useState } from "react";
import { useProduct } from "./useProduct";
import { useUserAuth } from "../context/UserAuthContext";
import { computeClientCartPricing } from "../utils/pricing";
import { previewCheckoutPricing } from "../lib/api";
import { getMinimumOrderQty, isProductOutOfStock, isProductLowStock } from "../utils/productAvailability";
import { clearBuyNowSession, loadBuyNowSession, updateBuyNowQuantity } from "../utils/buyNowSession";

/**
 * Backs a Buy Now checkout with the same item/pricing shape the cart produces,
 * so the checkout pages don't branch on where the purchase came from.
 *
 * The stored session holds only a productId, a quantity and the customization
 * blob — never a price or a name. Everything the customer is shown is
 * re-resolved from the live Product on every mount, which is what makes
 * "price changed while you were checking out" and "this went out of stock"
 * detectable rather than silently wrong.
 */
export function useBuyNowSource() {
  const { token } = useUserAuth();

  // Read once per mount. sessionStorage isn't reactive, and re-reading on
  // every render would fight the local quantity state below.
  const [session, setSession] = useState(() => loadBuyNowSession());
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const isExpired = Boolean(session?.expired);
  const productId = !isExpired ? session?.productId : null;
  const quantity = !isExpired ? (session?.quantity ?? 0) : 0;

  const { data: product, isLoading, isError } = useProduct(productId);

  // A product deleted or archived mid-checkout. `isError` covers a 404;
  // a non-active status comes back as a normal 200 the query can't flag.
  const isMissing = Boolean(productId) && !isLoading && (isError || !product || product.status !== "active");
  const isOutOfStock = !isMissing && isProductOutOfStock(product);
  const isLowStock = !isMissing && isProductLowStock(product);

  const minQuantity = product ? getMinimumOrderQty(product) : 1;
  const maxQuantity = product ? Math.max(0, Number(product.stock) || 0) : 0;
  const exceedsStock = !isMissing && !isOutOfStock && quantity > maxQuantity;

  // The customer clicked Buy Now at one price and is paying at another. The
  // order endpoint would silently charge the new price, so this has to be
  // surfaced rather than absorbed.
  const priceChanged =
    !isMissing &&
    session?.unitPriceAtStart != null &&
    product != null &&
    Number(product.price) !== Number(session.unitPriceAtStart);

  const items = useMemo(() => {
    if (!product || isMissing) {
      return [];
    }

    return [
      {
        productId: product.id,
        quantity,
        savedForLater: false,
        priceAtAdd: session?.unitPriceAtStart ?? product.price,
        product,
        isMissing: false,
        isOutOfStock,
        isLowStock,
        isPriceChanged: priceChanged,
        lineTotal: product.price * quantity,
        // Carried through so the review step can attach the studio artwork
        // and the order line can record what was personalized.
        customization: session?.customization ?? null,
      },
    ];
  }, [product, isMissing, quantity, session, isOutOfStock, isLowStock, priceChanged]);

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
        customizationText: item.customization?.optionsSummary || "",
      })),
    [items],
  );

  // Computed locally so the totals move the instant the stepper does. The
  // coupon descriptor came from the server's preview endpoint; the order
  // endpoint re-validates it independently at placement.
  const pricing = useMemo(() => {
    const purchasable = items.filter((item) => !item.isMissing && !item.isOutOfStock);
    return computeClientCartPricing(
      purchasable.map((item) => ({ price: item.product.price, mrp: item.product.mrp, quantity: item.quantity })),
      coupon,
    );
  }, [items, coupon]);

  const setQuantity = useCallback(
    (nextQuantity) => {
      const clamped = Math.max(minQuantity, Math.min(Number(nextQuantity) || minQuantity, maxQuantity || minQuantity));
      const updated = updateBuyNowQuantity(clamped);
      if (updated) {
        setSession(updated);
      }
    },
    [minQuantity, maxQuantity],
  );

  // A coupon that was valid at 1 unit may fall below its minimum when the
  // customer reduces the quantity. Re-check against the live subtotal rather
  // than leaving a now-invalid discount applied.
  const appliedCode = coupon?.code ?? null;
  const subtotalForCoupon = pricing.subtotal;

  useEffect(() => {
    if (!appliedCode || !coupon) {
      return;
    }
    if (coupon.minOrderValue == null) {
      return;
    }
    if (subtotalForCoupon >= coupon.minOrderValue) {
      return;
    }

    setCoupon(null);
    setCouponError(`This coupon needs a minimum order of ₹${coupon.minOrderValue}.`);
  }, [appliedCode, coupon, subtotalForCoupon]);

  const applyCoupon = useCallback(
    async (code) => {
      if (!productId || !code) {
        return;
      }

      setIsApplyingCoupon(true);
      setCouponError(null);

      try {
        const response = await previewCheckoutPricing(
          { lineItems: [{ productId, quantity }], couponCode: code },
          token,
        );

        if (response.coupon) {
          setCoupon(response.coupon);
        } else {
          setCoupon(null);
          const reason = response.couponError || "That coupon isn't valid for this order.";
          setCouponError(reason);
          // The preview endpoint answers "not applicable" with a 200, but the
          // coupon form (shared with the cart path, where the server returns
          // 400) shows its error by catching a rejection. Reject so both
          // sources report an unusable code the same way.
          throw new Error(reason);
        }
      } catch (error) {
        setCoupon(null);
        setCouponError(error.payload?.message || error.message || "Couldn't check that coupon.");
        throw error;
      } finally {
        setIsApplyingCoupon(false);
      }
    },
    [productId, quantity, token],
  );

  const removeCoupon = useCallback(async () => {
    setCoupon(null);
    setCouponError(null);
  }, []);

  const clearSource = useCallback(async () => {
    clearBuyNowSession();
    setSession(null);
  }, []);

  return {
    source: "buynow",
    isExpired,
    hasSession: Boolean(productId),
    items,
    cartItems,
    pricing,
    itemCount: items.length,
    isLoading: Boolean(productId) && isLoading,
    // Buy Now edge-case flags, surfaced for the checkout UI to act on.
    isMissing,
    isOutOfStock,
    exceedsStock,
    priceChanged,
    minQuantity,
    maxQuantity,
    quantity,
    setQuantity,
    coupon,
    couponError,
    isApplyingCoupon,
    applyCoupon,
    removeCoupon,
    clearSource,
    customization: session?.customization ?? null,
  };
}
