import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Check, Search, SearchX } from "lucide-react";
import ResponsiveImage from "../../../components/ResponsiveImage.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Skeleton from "../../../components/ui/Skeleton.jsx";
import StudioHeading from "./StudioHeading.jsx";
import { currencyFormatter } from "../../../components/ui/PriceDisplay.jsx";
import { filterProducts } from "../../productSearch.js";

/**
 * Product picker as an inspector VIEW, not a floating dropdown.
 *
 * The previous selector portalled its panel to document.body and placed it
 * with position:fixed. That was deliberate once — it escaped an ancestor
 * transform on the old page — but in the studio it meant the panel was
 * anchored to the viewport rather than to any layout region, so it spilled
 * across the canvas. No amount of offset math fixes an overlay that has no
 * owner.
 *
 * Rendering it as a view that replaces the inspector's content removes the
 * overlay entirely: it cannot cross a zone boundary because it isn't
 * floating, it scrolls with the panel it lives in, and it inherits the
 * panel's width by construction. Vertical space also stops being scarce,
 * so each row gets three comfortable lines instead of a squeezed one.
 */
function ProductPickerPanel({ products, value, isLoading, onSelect, onBack }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const results = useMemo(() => filterProducts(products, query), [products, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to product properties"
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <ChevronLeft size={15} aria-hidden="true" />
        </button>
        <StudioHeading level={2} className="text-sm font-semibold text-ink-900">
          Choose product
        </StudioHeading>
      </div>

      <div className="shrink-0 px-4 pb-3">
        {/* One boundary only: a tinted well that becomes white on focus,
            with the ring drawn outside it so it can't sit on a border. */}
        <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 py-2 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/30">
          <Search size={14} className="shrink-0 text-ink-400" aria-hidden="true" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            aria-label="Search products"
            placeholder="Search products"
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm leading-5 text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
        </div>
      </div>

      <div
        role="listbox"
        aria-label="Products"
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-4"
      >
        {isLoading ? (
          <div className="flex flex-col gap-2 px-2">
            {Array.from({ length: 5 }).map((_, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-ink-50 text-ink-400">
              <SearchX size={18} aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-ink-900">No products found</span>
            <span className="text-xs text-ink-400">Try a different name or category.</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {results.map((product) => {
              const isSelected = product.id === value;
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onSelect(product.id)}
                    className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors duration-150 ${
                      isSelected ? "bg-ink-100" : "hover:bg-ink-50"
                    }`}
                  >
                    <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-white">
                      <ResponsiveImage src={product.images?.[0]} alt="" aspectClassName="ratio-square" width={40} />
                    </span>

                    {/* Three bands, so nothing has to share a line and
                        nothing can collide at this width. */}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-900">{product.name}</span>
                        {isSelected ? (
                          <Check size={13} className="shrink-0 text-brand-500" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span className="truncate text-xs text-ink-400">{product.category}</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-ink-500">
                          from{" "}
                          <span className="font-semibold text-ink-900">
                            {currencyFormatter.format(product.price)}
                          </span>
                        </span>
                        {product.badge ? (
                          <Badge tone="brand" className="whitespace-nowrap">
                            {product.badge}
                          </Badge>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ProductPickerPanel;
