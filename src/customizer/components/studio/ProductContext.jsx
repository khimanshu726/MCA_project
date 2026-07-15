import PropertyCard from "./PropertyCard.jsx";
import OptionField from "./OptionField.jsx";
import QuantitySelector from "../../../components/ui/QuantitySelector.jsx";
import { currencyFormatter } from "../../../components/ui/PriceDisplay.jsx";

/**
 * Inspector content when nothing is selected: what am I printing, on what,
 * how many, and what will it cost.
 *
 * The estimate is deliberately a LINE estimate only. computeClientCartPricing
 * exists, but its platform fee and shipping are cart-wide (shipping is waived
 * over ₹1000 across every item), so a studio-only total would contradict
 * checkout for anyone with a non-empty cart. Better to show the one number
 * we can state truthfully and say where the rest is decided.
 */
function ProductContext({ product, template, design, quantity, onQuantityChange, actions, productSelector }) {
  const minQty = product.minimumOrderQty || 1;
  const lineTotal = product.price * quantity;

  return (
    <div className="flex flex-col gap-3">
      <PropertyCard title="Product">
        <div className="flex flex-col gap-2">
          {productSelector}
          <dl className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">Format</dt>
              <dd className="truncate font-medium text-ink-800">{template.label}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">Trim size</dt>
              <dd className="font-medium tabular-nums text-ink-800">
                {template.trim.width} × {template.trim.height} mm
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">Sides</dt>
              <dd className="font-medium text-ink-800">{template.sides.map((side) => side.label).join(" + ")}</dd>
            </div>
          </dl>
        </div>
      </PropertyCard>

      {template.options.length > 0 && (
        <PropertyCard title="Options">
          <div className="flex flex-col gap-3">
            {template.options.map((option) => (
              <OptionField
                key={option.id}
                option={option}
                value={design.options[option.id]}
                onChange={actions.setOption}
              />
            ))}
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-400">
            Sent to production with your order. These don&rsquo;t change the price.
          </p>
        </PropertyCard>
      )}

      <PropertyCard title="Quantity">
        <div className="flex items-center justify-between gap-2">
          <QuantitySelector
            value={quantity}
            onChange={onQuantityChange}
            min={minQty}
            max={100000}
            ariaLabel="Print quantity"
          />
          {minQty > 1 ? <span className="text-xs text-ink-400">Min {minQty}</span> : null}
        </div>
      </PropertyCard>

      <PropertyCard title="Estimate">
        <dl className="flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-500">
              {currencyFormatter.format(product.price)} × {quantity}
            </dt>
            <dd className="font-semibold tabular-nums text-ink-900">{currencyFormatter.format(lineTotal)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs leading-relaxed text-ink-400">Taxes &amp; shipping calculated at checkout.</p>
      </PropertyCard>
    </div>
  );
}

export default ProductContext;
