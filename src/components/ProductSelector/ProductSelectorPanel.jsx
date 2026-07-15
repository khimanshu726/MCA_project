import { useState } from "react";
import { Search, SearchX } from "lucide-react";
import ProductOptionRow from "./ProductOptionRow";
import ProductOptionSkeleton from "./ProductOptionSkeleton";

function OptionSection({ label, products, value, activeId, onSelect, onHover }) {
  if (products.length === 0) return null;

  return (
    <div role="group" aria-label={label} className="mb-1 last:mb-0">
      {/* Sticky so the group a row belongs to stays visible while scrolling. */}
      <p className="sticky top-0 z-10 bg-white/95 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-400 backdrop-blur">
        {label}
      </p>
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
  // The shortcut legend is only useful once someone is actually driving the
  // list from the keyboard, and it cost ~34px of browsing height on every
  // open. Reveal it on first arrow key instead.
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  const handleKeyDown = (event) => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      setIsKeyboardNav(true);
    }
    onKeyDown(event);
  };

  return (
    <div
      style={style || undefined}
      className="animate-[product-selector-sheet-in_200ms_ease-out] sm:animate-[product-selector-in_150ms_ease-out] fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-3xl bg-white shadow-overlay sm:z-20 sm:max-h-96 sm:rounded-2xl"
      role="presentation"
    >
      <span
        className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-ink-200 sm:hidden"
        aria-hidden="true"
      />

      <div className="shrink-0 p-2">
        {/* Single boundary: the field is a tinted well, not a bordered box
            inside a bordered panel (which read as a double border). */}
        <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 transition-shadow focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/30">
          <Search size={15} className="shrink-0 text-ink-400" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeProduct ? `product-option-${activeProduct.id}` : undefined}
            autoComplete="off"
            placeholder="Search products"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
        </div>
      </div>

      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label="Products"
        className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-2"
      >
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
            <span className="text-sm font-medium text-ink-900">No products found</span>
            <span className="text-xs text-ink-400">Try a different name or category.</span>
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

      {isKeyboardNav ? (
        <div className="hidden shrink-0 items-center gap-3 px-3 py-1.5 text-xs text-ink-400 sm:flex">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-ink-100 px-1.5 py-0.5 font-sans text-ink-500">&uarr;&darr;</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-ink-100 px-1.5 py-0.5 font-sans text-ink-500">&crarr;</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-ink-100 px-1.5 py-0.5 font-sans text-ink-500">Esc</kbd>
            Close
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default ProductSelectorPanel;
