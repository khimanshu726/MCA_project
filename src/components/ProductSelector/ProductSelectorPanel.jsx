import { Search, SearchX } from "lucide-react";
import ProductOptionRow from "./ProductOptionRow";
import ProductOptionSkeleton from "./ProductOptionSkeleton";

function OptionSection({ label, products, value, activeId, onSelect, onHover }) {
  if (products.length === 0) return null;

  return (
    <div role="group" aria-label={label} className="mb-1 last:mb-0">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      {products.map((product) => (
        <ProductOptionRow
          key={product.id}
          product={product}
          isActive={activeId === product.id}
          isSelected={value === product.id}
          onSelect={onSelect}
          onMouseEnter={() => onHover(product.id)}
        />
      ))}
    </div>
  );
}

function ProductSelectorPanel({
  listboxId,
  isLoading,
  query,
  onQueryChange,
  onKeyDown,
  searchInputRef,
  listRef,
  sections,
  flatOptions,
  activeIndex,
  onHoverProduct,
  value,
  onSelect,
  isSearching,
  style,
}) {
  const activeProduct = flatOptions[activeIndex];

  return (
    <div
      style={style || undefined}
      className="animate-[product-selector-sheet-in_200ms_ease-out] sm:animate-[product-selector-in_150ms_ease-out] fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-3xl border border-ink-100 bg-white shadow-2xl sm:z-20 sm:max-h-96 sm:rounded-2xl sm:border sm:shadow-xl"
      role="presentation"
    >
      <span
        className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-ink-200 sm:hidden"
        aria-hidden="true"
      />

      <div className="shrink-0 border-b border-ink-100 p-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/20">
          <Search size={16} className="shrink-0 text-ink-400" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeProduct ? `product-option-${activeProduct.id}` : undefined}
            autoComplete="off"
            placeholder="Search products by name or category..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
        </div>
      </div>

      <div ref={listRef} id={listboxId} role="listbox" aria-label="Products" className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <ProductOptionSkeleton key={index} />
            ))}
          </div>
        ) : flatOptions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-ink-50 text-ink-400">
              <SearchX size={20} aria-hidden="true" />
            </span>
            <p className="font-display text-base text-ink-900">No products found</p>
            <p className="text-xs text-ink-500">Try a different name or category.</p>
          </div>
        ) : (
          <>
            {!isSearching ? (
              <OptionSection
                label="Recently used"
                products={sections.recent}
                value={value}
                activeId={activeProduct?.id}
                onSelect={onSelect}
                onHover={onHoverProduct}
              />
            ) : null}
            {!isSearching ? (
              <OptionSection
                label="Popular"
                products={sections.popular}
                value={value}
                activeId={activeProduct?.id}
                onSelect={onSelect}
                onHover={onHoverProduct}
              />
            ) : null}
            <OptionSection
              label={isSearching ? "Results" : "All products"}
              products={sections.main}
              value={value}
              activeId={activeProduct?.id}
              onSelect={onSelect}
              onHover={onHoverProduct}
            />
          </>
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-3 border-t border-ink-100 px-3 py-2 text-[11px] text-ink-400 sm:flex">
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-sans">&uarr;&darr;</kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-sans">Enter</kbd>
          Select
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-sans">Esc</kbd>
          Close
        </span>
      </div>
    </div>
  );
}

export default ProductSelectorPanel;
