import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import ResponsiveImage from "../ResponsiveImage";
import Skeleton from "../ui/Skeleton";
import ProductSelectorPanel from "./ProductSelectorPanel";
import { useProductSelector } from "./useProductSelector";

// Below this width the panel is a bottom sheet docked to the viewport;
// above it, it's a dropdown anchored under the trigger.
const MOBILE_BREAKPOINT = 640;

/**
 * Searchable product combobox — replaces a plain <select> with thumbnails,
 * category/price context, recent + popular quick-picks, and full keyboard
 * support. See useProductSelector.js for the behavior; this file only
 * renders the trigger + panel it's handed.
 *
 * The panel is portaled to document.body rather than rendered inline: pages
 * on this site wrap their content in .section-panel, which carries a
 * fill-mode entrance animation (see styles.css). Even after that animation
 * finishes, its specified `transform` establishes a new containing block for
 * `position: fixed` descendants per the CSS spec — an inline fixed-position
 * panel would render clipped to that ancestor's box instead of the
 * viewport. Portaling to <body> sidesteps the whole class of ancestor
 * transform/overflow/z-index issues, which is why Dialog.jsx and other
 * floating UI in mature component libraries do the same.
 */
function ProductSelector({ products, value, onChange, isLoading = false, label, id }) {
  const generatedId = useId();
  const triggerId = id || `product-selector-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;

  const {
    isOpen,
    open,
    close,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    selectedProduct,
    sections,
    flatOptions,
    isSearching,
    selectProduct,
    handleSearchKeyDown,
    handleTriggerKeyDown,
    containerRef,
    panelRef,
    searchInputRef,
    triggerRef,
    listRef,
  } = useProductSelector({ products, value, onChange, isLoading });

  const [panelStyle, setPanelStyle] = useState(null);

  // Recompute the anchored (desktop) position on open and whenever the
  // trigger might have moved — window resize, or the page scrolling under
  // it. Capture-phase scroll listener so this catches scrolling in any
  // ancestor container, not just the window.
  useEffect(() => {
    if (!isOpen) return undefined;

    const updatePosition = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setPanelStyle(null);
        return;
      }
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // right/bottom explicitly cleared: the panel's base classes include
      // inset-x-0 bottom-0 for the mobile sheet, which would otherwise
      // stretch this fixed box down to the viewport bottom instead of
      // sizing to content beneath the trigger.
      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        right: "auto",
        bottom: "auto",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, triggerRef]);

  const handleHoverProduct = (productId) => {
    const index = flatOptions.findIndex((product) => product.id === productId);
    if (index >= 0) setActiveIndex(index);
  };

  return (
    <div ref={containerRef} className="relative">
      {label ? (
        <label htmlFor={triggerId} className="mb-1.5 block text-sm font-medium text-ink-700">
          {label}
        </label>
      ) : null}

      {isLoading && !selectedProduct ? (
        <div className="flex h-[68px] items-center gap-3 rounded-2xl border border-ink-200 bg-white px-3 shadow-xs">
          <Skeleton className="h-11 w-11 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ) : (
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-label={!label ? "Select a product" : undefined}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={handleTriggerKeyDown}
          className={`flex w-full items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 text-left shadow-xs transition-all duration-150 hover:border-brand-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 ${
            isOpen ? "border-brand-400 ring-2 ring-brand-500/20" : "border-ink-200"
          }`}
        >
          {selectedProduct ? (
            <>
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                <ResponsiveImage src={selectedProduct.images?.[0]} alt="" aspectClassName="ratio-square" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{selectedProduct.name}</p>
                <p className="truncate text-xs text-ink-500">{selectedProduct.category}</p>
              </div>
            </>
          ) : (
            <span className="flex-1 text-sm text-ink-400">Select a product&hellip;</span>
          )}

          <ChevronDown
            size={18}
            className={`shrink-0 text-ink-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}

      {isOpen
        ? createPortal(
            <div ref={panelRef}>
              {/* Mobile-only backdrop — the panel itself is a fixed bottom
                  sheet below sm:, so it needs its own dismiss target behind it. */}
              <div className="fixed inset-0 z-40 bg-ink-950/30 sm:hidden" aria-hidden="true" onClick={close} />
              <ProductSelectorPanel
                listboxId={listboxId}
                isLoading={isLoading}
                query={query}
                onQueryChange={setQuery}
                onKeyDown={handleSearchKeyDown}
                searchInputRef={searchInputRef}
                listRef={listRef}
                sections={sections}
                flatOptions={flatOptions}
                activeIndex={activeIndex}
                onHoverProduct={handleHoverProduct}
                value={value}
                onSelect={selectProduct}
                isSearching={isSearching}
                style={panelStyle}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default ProductSelector;
