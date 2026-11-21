/**
 * Volume (quantity-break) pricing: "100+ ₹18 · 250+ ₹16 · 500+ ₹14".
 *
 * A product's base `price` applies from its minimum order quantity up; each
 * entry in `priceTiers` ({ minQty, price }) applies from its own quantity up.
 * The unit price for a quantity is the price of the largest tier that quantity
 * reaches.
 *
 * Shared by the browser and the Node server (like productAvailability.js), so
 * the price shown on the product page, in the cart and at checkout is the one
 * the server charges. Keep it pure.
 */

export const MAX_PRICE_TIERS = 6;

/** Tiers sorted by quantity, ignoring malformed entries. */
export const getSortedTiers = (product) =>
  (Array.isArray(product?.priceTiers) ? product.priceTiers : [])
    .map((tier) => ({ minQty: Number(tier?.minQty), price: Number(tier?.price) }))
    .filter((tier) => Number.isFinite(tier.minQty) && tier.minQty > 0 && Number.isFinite(tier.price) && tier.price >= 0)
    .sort((a, b) => a.minQty - b.minQty);

/** The unit price charged when buying `quantity` of `product`. */
export const getUnitPrice = (product, quantity) => {
  const base = Number(product?.price) || 0;
  const qty = Number(quantity) || 0;
  let unitPrice = base;
  for (const tier of getSortedTiers(product)) {
    if (qty >= tier.minQty) unitPrice = tier.price;
  }
  return unitPrice;
};

/** The next cheaper tier above `quantity`, or null if already at the best price. */
export const getNextTier = (product, quantity) => {
  const qty = Number(quantity) || 0;
  return getSortedTiers(product).find((tier) => tier.minQty > qty) || null;
};

/**
 * Validates tiers as entered by an admin. Returns { tiers, errors } where
 * `tiers` is the cleaned, sorted list and `errors` is a list of messages
 * (empty when valid). Rules: at most MAX_PRICE_TIERS; each quantity whole,
 * at least the product's minimum order and unique; each price positive and
 * below the base price; prices never rise as quantity rises.
 */
export const validatePriceTiers = (rawTiers, { price, minimumOrderQty = 1 } = {}) => {
  const errors = [];
  if (rawTiers == null) return { tiers: [], errors };
  if (!Array.isArray(rawTiers)) return { tiers: [], errors: ["Bulk pricing must be a list of quantity and price rows."] };

  if (rawTiers.length > MAX_PRICE_TIERS) {
    errors.push(`Add at most ${MAX_PRICE_TIERS} bulk price rows.`);
  }

  const base = Number(price);
  const moq = Math.max(1, Number(minimumOrderQty) || 1);
  const tiers = rawTiers.map((tier) => ({ minQty: Number(tier?.minQty), price: Number(tier?.price) }));

  tiers.forEach((tier, index) => {
    const row = `Bulk price row ${index + 1}`;
    if (!Number.isInteger(tier.minQty) || tier.minQty < 1) {
      errors.push(`${row}: quantity must be a whole number.`);
    } else if (tier.minQty <= moq) {
      errors.push(`${row}: quantity must be more than the minimum order (${moq}); the base price already covers ${moq}.`);
    }
    if (!Number.isFinite(tier.price) || tier.price <= 0) {
      errors.push(`${row}: price must be more than ₹0.`);
    } else if (Number.isFinite(base) && tier.price >= base) {
      errors.push(`${row}: price must be lower than the base price (₹${base}).`);
    }
  });

  const quantities = tiers.map((tier) => tier.minQty);
  if (new Set(quantities).size !== quantities.length) {
    errors.push("Each bulk price row needs a different quantity.");
  }

  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].price > sorted[i - 1].price) {
      errors.push(
        `Buying ${sorted[i].minQty}+ can't cost more per unit (₹${sorted[i].price}) than buying ${sorted[i - 1].minQty}+ (₹${sorted[i - 1].price}).`,
      );
    }
  }

  return { tiers: sorted, errors };
};
