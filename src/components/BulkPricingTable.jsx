import { getMinimumOrderQty } from "../utils/productAvailability";
import { getSortedTiers } from "../utils/tierPricing";
import { currencyFormatter } from "./ui/PriceDisplay";

const money = (value) => currencyFormatter.format(value);
const quantityText = (value) => new Intl.NumberFormat("en-IN").format(value);

/**
 * Builds the rows a customer reads: each quantity range, its price per piece,
 * and how much that saves against the starting price.
 */
export const buildBulkRows = (product) => {
  const tiers = getSortedTiers(product);
  if (tiers.length === 0) return [];
  const basePrice = Number(product.price);
  const breaks = [{ minQty: getMinimumOrderQty(product), price: basePrice }, ...tiers];
  return breaks.map((row, index) => {
    const next = breaks[index + 1];
    const saving = Math.max(0, basePrice - row.price);
    return {
      minQty: row.minQty,
      maxQty: next ? next.minQty - 1 : null,
      price: row.price,
      saving,
      percentOff: basePrice > 0 ? Math.round((saving / basePrice) * 100) : 0,
    };
  });
};

const rangeLabel = (row) =>
  row.maxQty === null || row.maxQty <= row.minQty
    ? `${quantityText(row.minQty)}+`
    : `${quantityText(row.minQty)}–${quantityText(row.maxQty)}`;

/**
 * "Buy more, save more" for a product with volume tiers. Shows each quantity
 * range with its price each and saving, marks the range the selected
 * quantity falls in, and lets a row set the quantity. Renders nothing for a
 * product without tiers.
 */
function BulkPricingTable({ product, quantity, onSelectQuantity, maxQuantity }) {
  const rows = buildBulkRows(product);
  if (rows.length === 0) return null;

  const activeIndex = rows.reduce((found, row, index) => (quantity >= row.minQty ? index : found), 0);
  const best = rows[rows.length - 1];

  const canPick = (row) => Boolean(onSelectQuantity) && (!maxQuantity || row.minQty <= maxQuantity);

  return (
    <section className="bulk-pricing" aria-labelledby="bulk-pricing-heading">
      <div className="bulk-pricing-head">
        <h2 id="bulk-pricing-heading">Buy more, save more</h2>
        <p>
          The more you order, the less you pay each. Save up to <strong>{best.percentOff}%</strong>.
        </p>
      </div>

      <table className="bulk-pricing-table">
        <thead>
          <tr>
            <th scope="col">Quantity</th>
            <th scope="col">Price each</th>
            <th scope="col">You save</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isActive = index === activeIndex;
            const pickable = canPick(row) && !isActive;
            return (
              <tr
                key={row.minQty}
                data-active={isActive ? "true" : "false"}
                aria-current={isActive ? "true" : undefined}
                className={`${isActive ? "is-active" : ""}${pickable ? " is-pickable" : ""}`}
                onClick={pickable ? () => onSelectQuantity(row.minQty) : undefined}
              >
                <th scope="row">
                  {pickable ? (
                    <button
                      type="button"
                      className="bulk-pricing-pick"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectQuantity(row.minQty);
                      }}
                      aria-label={`Order ${quantityText(row.minQty)} at ${money(row.price)} each`}
                    >
                      {rangeLabel(row)}
                    </button>
                  ) : (
                    rangeLabel(row)
                  )}
                </th>
                <td className="bulk-pricing-price">{money(row.price)}</td>
                <td className="bulk-pricing-saving">
                  {row.saving > 0 ? (
                    <>
                      <strong>{row.percentOff}% off</strong>
                      <span>{money(row.saving)} less each</span>
                    </>
                  ) : (
                    <span className="bulk-pricing-muted">Starting price</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default BulkPricingTable;
