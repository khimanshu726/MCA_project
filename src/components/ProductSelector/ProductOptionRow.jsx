import { memo } from "react";
import { Check } from "lucide-react";
import ResponsiveImage from "../ResponsiveImage";
import Badge from "../ui/Badge";
import { currencyFormatter } from "../ui/PriceDisplay";

function ProductOptionRow({ product, isActive, isSelected, onSelect, onMouseEnter }) {
  return (
    <li
      id={`product-option-${product.id}`}
      data-option-id={product.id}
      role="option"
      aria-selected={isSelected}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-100 ${
        isActive ? "bg-brand-50" : "hover:bg-ink-50"
      }`}
      // onMouseDown (not onClick) + preventDefault so the search input never
      // loses focus mid-click, which would otherwise close the panel before
      // the click's onClick phase fires.
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect(product);
      }}
      onMouseEnter={onMouseEnter}
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-50">
        <ResponsiveImage src={product.images?.[0]} alt="" aspectClassName="ratio-square" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-ink-900">{product.name}</p>
          {product.badge ? (
            <Badge tone="brand" className="shrink-0 whitespace-nowrap">
              {product.badge}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-ink-500">{product.category}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[11px] text-ink-400">Starting at</span>
        <span className="text-sm font-semibold text-ink-900">{currencyFormatter.format(product.price)}</span>
      </div>

      <span className="flex size-4 shrink-0 items-center justify-center">
        {isSelected ? <Check size={16} className="text-brand-600" aria-hidden="true" /> : null}
      </span>
    </li>
  );
}

export default memo(ProductOptionRow);
