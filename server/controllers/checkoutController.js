import { getProductsByIds } from "../services/productStore.js";
import { computeCartPricing } from "../services/pricingService.js";
import { findCouponByCode, validateCoupon } from "../services/couponStore.js";
import { normalizeLineItems, parseLineItems } from "../utils/orderHelpers.js";

/**
 * Stateless coupon + pricing preview for a proposed set of line items.
 *
 * The existing coupon endpoint (POST /api/cart/coupon) works by *mutating*
 * the customer's server cart, which is exactly wrong for a Buy Now checkout:
 * a Buy Now must not touch the cart, and a guest-turned-customer buying a
 * single item may have a cart full of unrelated things whose coupon state
 * must not change.
 *
 * This endpoint answers the same question without any persistence — "given
 * these items and this code, what does the customer pay?" — which is all the
 * Buy Now summary needs. It is a *preview* and holds no authority: the order
 * endpoint independently re-resolves prices, re-validates the coupon against
 * its own computed subtotal, and re-checks stock at placement
 * (see orderController.createOrder). A stale or spoofed preview cannot
 * produce a cheaper order.
 *
 * The subtotal is computed here from live Product records rather than read
 * from the request. Trusting a client-supplied subtotal would let anyone
 * satisfy a coupon's minimum-order rule by simply claiming a larger one.
 */
export const previewCheckoutPricing = async (req, res, next) => {
  try {
    const requestedLineItems = normalizeLineItems(parseLineItems(req.body.lineItems));

    if (requestedLineItems.length === 0) {
      return res.status(400).json({ message: "At least one line item is required." });
    }

    const productIds = [...new Set(requestedLineItems.map((item) => item.productId))];
    const products = await getProductsByIds(productIds);
    const productsById = new Map(products.map((product) => [product.id, product]));

    const missingIds = productIds.filter((id) => !productsById.has(id) || productsById.get(id).status !== "active");

    if (missingIds.length > 0) {
      return res.status(400).json({
        code: "PRODUCT_NOT_FOUND",
        message: "This product is no longer available.",
        productIds: missingIds,
      });
    }

    const pricingItems = requestedLineItems.map((item) => {
      const product = productsById.get(item.productId);
      return { price: product.price, mrp: product.mrp, quantity: item.quantity };
    });

    const subtotal = pricingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const code = typeof req.body.couponCode === "string" ? req.body.couponCode.trim() : "";

    if (!code) {
      return res.json({ pricing: computeCartPricing(pricingItems, null), coupon: null, couponError: null });
    }

    const candidate = await findCouponByCode(code);
    const validation = validateCoupon(candidate, subtotal);

    if (!validation.valid) {
      // 200, not 4xx: "this code doesn't apply to this basket" is a normal
      // answer to a preview question, not a failed request. The caller
      // renders `couponError` beside the still-valid uncouponed pricing.
      return res.json({
        pricing: computeCartPricing(pricingItems, null),
        coupon: null,
        couponError: validation.reason,
      });
    }

    return res.json({
      pricing: computeCartPricing(pricingItems, candidate),
      // Only the fields the client needs to recompute the discount live as
      // the quantity changes — never the whole coupon record.
      coupon: {
        code: candidate.code,
        type: candidate.type,
        value: candidate.value,
        maxDiscount: candidate.maxDiscount ?? null,
        minOrderValue: candidate.minOrderValue ?? 0,
      },
      couponError: null,
    });
  } catch (error) {
    return next(error);
  }
};
