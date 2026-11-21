import { getMinimumOrderQty } from "../utils/productAvailability";
import { getNextTier, getSortedTiers, getUnitPrice } from "../utils/tierPricing";
import { currencyFormatter } from "./ui/PriceDisplay";

/**
 * "Bulk pricing" for a product with volume tiers: one row per quantity break,
 * the row that applies to the selected quantity highlighted, and a nudge to
 * the next cheaper break. Renders nothing for a product without tiers.
 */
function BulkPricingTable({ product, quantity }) {
  const tiers = getSortedTiers(product);
  if (tiers.length === 0) return null;

  const rows = [{ minQty: getMinimumOrderQty(product), price: Number(product.price) }, ...tiers];
  const activePrice = getUnitPrice(product, quantity);
  const activeIndex = rows.reduce((found, row, index) => (quantity >= row.minQty ? index : found), 0);
  const nextTier = getNextTier(product, quantity);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4" aria-label="Bulk pricing">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Bulk pricing</p>
      <ul className="flex flex-wrap gap-2">
        {rows.map((row, index) => {
          const isActive = index === activeIndex;
          return (
            <li
              key={row.minQty}
              data-active={isActive ? "true" : "false"}
              className={`rounded-xl border px-3 py-2 text-sm ${
                isActive ? "border-brand-500 bg-brand-50 font-semibold text-ink-900" : "border-ink-100 text-ink-600"
              }`}
            >
              {row.minQty}+ &middot; {currencyFormatter.format(row.price)} each
            </li>
          );
        })}
      </ul>
      {nextTier ? (
        <p className="mt-2 text-xs text-ink-600">
          Order {nextTier.minQty}+ to pay {currencyFormatter.format(nextTier.price)} each (save{" "}
          {currencyFormatter.format(activePrice - nextTier.price)} per unit).
        </p>
      ) : (
        <p className="mt-2 text-xs text-success-600">You&rsquo;re getting the best bulk price.</p>
      )}
    </div>
  );
}

export default BulkPricingTable;
