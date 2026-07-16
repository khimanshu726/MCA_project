import { ChevronRight } from "lucide-react";
import PropertyCard from "./PropertyCard.jsx";
import OptionField from "./OptionField.jsx";
import ResponsiveImage from "../../../components/ResponsiveImage.jsx";
import QuantitySelector from "../../../components/ui/QuantitySelector.jsx";
import { currencyFormatter } from "../../../components/ui/PriceDisplay.jsx";

/**
 * Inspector content when nothing is selected: what am I printing, on what,
 * how many, what will it cost.
 *
 * The identity block is intentionally untitled — the inspector header
 * already says "Product", and repeating it produced a literal
 * "PRODUCT / PRODUCT / Storefront Banner" stack.
 *
 * The estimate is a LINE estimate only. computeClientCartPricing exists,
 * but its platform fee and shipping are cart-wide (shipping is waived over
 * ₹1000 across every item), so a studio-only total would contradict
 * checkout for anyone with a non-empty cart. Show the one number that can
 * be stated truthfully, and say where the rest is decided.
 */
function ProductContext({ product, template, design, quantity, onQuantityChange, actions, onOpenProductPicker }) {
  const minQty = product.minimumOrderQty || 1;
  const lineTotal = product.price * quantity;
  const sideLabels = template.sides.map((side) => side.label).join(" + ");

  return (
    <div className="flex flex-col gap-3">
      {/* Identity — no heading; the panel header already names this.
          The trigger opens a picker VIEW inside this panel rather than a
          floating dropdown, so it cannot spill onto the canvas. */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onOpenProductPicker}
          className="flex w-full items-center gap-2.5 rounded-lg bg-ink-50 p-2 text-left transition-colors duration-150 hover:bg-ink-100"
        >
          <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-white">
            <ResponsiveImage src={product.images?.[0]} alt="" aspectClassName="ratio-square" width={36} />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{product.name}</span>
          <ChevronRight size={14} className="shrink-0 text-ink-400" aria-hidden="true" />
        </button>

        <div className="flex flex-col gap-0.5 px-0.5">
          <span className="block text-sm font-medium text-ink-900">{template.label}</span>
          <span className="block text-xs text-ink-400">
            <span className="tabular-nums">
              {template.trim.width} × {template.trim.height} mm
            </span>
            {" · "}
            {sideLabels}
          </span>
        </div>
      </div>

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
          <span className="block mt-3 text-xs leading-relaxed text-ink-400">
            Sent to production with your order. These don&rsquo;t change the price.
          </span>
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
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-ink-400 tabular-nums">
            {currencyFormatter.format(product.price)} × {quantity}
          </span>
          <span className="text-base font-semibold tabular-nums text-ink-900">
            {currencyFormatter.format(lineTotal)}
          </span>
        </div>
        <span className="block mt-2 text-xs leading-relaxed text-ink-400">Taxes &amp; shipping calculated at checkout.</span>
      </PropertyCard>
    </div>
  );
}

export default ProductContext;
