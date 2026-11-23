/**
 * The single definition of "can this product be bought right now".
 *
 * This rule used to be written out in four places with three different
 * answers, which is what let a product be added to the cart and then priced
 * at zero:
 *
 *   - cartController.js  stock <= 0 || stock < minimumOrderQty   (canonical)
 *   - useCart.js         the same rule, hand-copied
 *   - ProductDetailPage  stock <= 0                              (missed MOQ)
 *   - ProductCard        no check at all
 *   - AddToCartButton    no check at all
 *
 * So `launch-flyer` (stock 100, MOQ 250) offered an enabled "Add to cart",
 * accepted the click, incremented the badge to 250 — and then the cart, which
 * used the stricter rule, called it out of stock, excluded it from pricing,
 * and showed "0 items / ₹0" with checkout blocked.
 *
 * Imported by BOTH the browser and the Node server (server/ already imports
 * from src/ — see productMigration.js). Keep this module pure and free of
 * browser or React globals so that stays true; it is the only thing
 * guaranteeing the two sides can't drift apart again.
 */

/** Below this, we warn the customer but still sell. */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * A product's own floor. Print runs have real minimums — a flyer pack sold in
 * lots of 250 cannot be bought as a single flyer.
 */
export const getMinimumOrderQty = (product) => {
  const moq = Number(product?.minimumOrderQty);
  return Number.isFinite(moq) && moq > 0 ? moq : 1;
};

/**
 * Out of stock means stock can't satisfy the product's own minimum order
 * quantity — not merely that stock is zero, and deliberately independent of
 * whatever quantity is sitting in a given cart line. A too-high cart quantity
 * is recoverable by lowering it; this isn't.
 */
export const isProductOutOfStock = (product) => {
  if (!product) return true;
  const stock = Number(product.stock);
  if (!Number.isFinite(stock) || stock <= 0) return true;
  return stock < getMinimumOrderQty(product);
};

/**
 * The quantity a product is sold in steps of, from its minimum: a step of 50
 * with an MOQ of 100 allows 100, 150, 200… Products without one step by 1.
 */
export const getQuantityStep = (product) => {
  const step = Number(product?.quantityStep);
  return Number.isInteger(step) && step > 1 ? step : 1;
};

/**
 * Puts a quantity on the product's grid (min, min + step, min + 2·step…),
 * never below `min` and never above `max` (above it, the last allowed
 * quantity at or under max wins). `direction` is "nearest", "up" or "down".
 */
export const snapQuantity = (quantity, { min = 1, max = Infinity, step = 1 } = {}, direction = "nearest") => {
  const floor = Math.max(1, Number(min) || 1);
  const ceiling = Number.isFinite(Number(max)) ? Math.max(floor, Number(max)) : Infinity;
  const size = Number.isInteger(step) && step > 1 ? step : 1;
  const wanted = Math.min(ceiling, Math.max(floor, Number(quantity) || floor));
  const steps = (wanted - floor) / size;
  const round = direction === "up" ? Math.ceil : direction === "down" ? Math.floor : Math.round;
  let snapped = floor + round(steps) * size;
  while (snapped > ceiling && snapped - size >= floor) snapped -= size;
  return Math.min(snapped, Math.max(floor, ceiling));
};

export const isProductLowStock = (product) =>
  Boolean(product) && !isProductOutOfStock(product) && Number(product.stock) <= LOW_STOCK_THRESHOLD;

/**
 * The quantity an "Add to cart" click should use: the product's minimum, but
 * never more than what's actually on hand.
 */
export const getDefaultOrderQty = (product) =>
  Math.min(getMinimumOrderQty(product), Math.max(1, Number(product?.stock) || 1));
