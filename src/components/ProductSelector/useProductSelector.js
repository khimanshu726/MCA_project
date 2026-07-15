import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterProducts } from "./productSearch";
import { loadRecentSelectionIds, recordSelectionId } from "../../utils/productSelectorStorage";

const RECENT_LIMIT = 4;
const POPULAR_LIMIT = 4;

/**
 * Owns all combobox behavior — open/close, search, keyboard navigation,
 * section grouping (recent/popular/all), and outside-click/scroll handling —
 * so ProductSelector.jsx only has to render what this hook decides.
 */
export function useProductSelector({ products, value, onChange, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState(loadRecentSelectionIds);

  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const selectedProduct = useMemo(() => products.find((product) => product.id === value) || null, [products, value]);

  const isSearching = query.trim().length > 0;
  const filteredProducts = useMemo(() => filterProducts(products, query), [products, query]);

  // Recent/Popular are quick-pick shortcuts shown only while idle (no active
  // search) — once the customer starts typing, the flat filtered list alone
  // is the source of truth so search results aren't confused with shortcuts.
  const sections = useMemo(() => {
    if (isSearching) {
      return { recent: [], popular: [], main: filteredProducts };
    }

    const recent = recentIds
      .map((id) => products.find((product) => product.id === id))
      .filter(Boolean)
      .slice(0, RECENT_LIMIT);
    const recentSet = new Set(recent.map((product) => product.id));

    const popular = products
      .filter((product) => product.featured && !recentSet.has(product.id))
      .slice(0, POPULAR_LIMIT);
    const popularSet = new Set(popular.map((product) => product.id));

    const main = products.filter((product) => !recentSet.has(product.id) && !popularSet.has(product.id));

    return { recent, popular, main };
  }, [isSearching, filteredProducts, recentIds, products]);

  // One flat, DOM-ordered list drives keyboard navigation regardless of
  // which section an option visually belongs to.
  const flatOptions = useMemo(
    () => [...sections.recent, ...sections.popular, ...sections.main],
    [sections],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const open = useCallback(() => {
    if (isLoading) return;
    setIsOpen(true);
  }, [isLoading]);

  const selectProduct = useCallback(
    (product) => {
      onChange(product.id);
      recordSelectionId(product.id);
      setRecentIds(loadRecentSelectionIds());
      close();
      triggerRef.current?.focus();
    },
    [onChange, close],
  );

  // Reset the active option to the current selection (or the top of the
  // list) every time the panel opens, and re-focus the search field.
  useEffect(() => {
    if (!isOpen) return;

    const selectedIndex = flatOptions.findIndex((product) => product.id === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    searchInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keep the active option in view as arrow keys move past the fold.
  useEffect(() => {
    if (!isOpen) return;
    const activeProduct = flatOptions[activeIndex];
    if (!activeProduct) return;
    const node = listRef.current?.querySelector(`[data-option-id="${activeProduct.id}"]`);
    // jsdom (unit tests) doesn't implement scrollIntoView.
    node?.scrollIntoView?.({ block: "nearest" });
  }, [isOpen, activeIndex, flatOptions]);

  useEffect(() => {
    if (!isOpen) return undefined;

    // The panel is portaled to document.body (see ProductSelector.jsx), so
    // it's not a DOM descendant of containerRef — panelRef has to be
    // checked separately, or every click inside the panel would register
    // as "outside" and close it instantly.
    const handlePointerDown = (event) => {
      const insideTrigger = containerRef.current?.contains(event.target);
      const insidePanel = panelRef.current?.contains(event.target);
      if (!insideTrigger && !insidePanel) {
        close();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, close]);

  const handleSearchKeyDown = useCallback(
    (event) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((index) => Math.min(index + 1, flatOptions.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((index) => Math.max(index - 1, 0));
          break;
        case "Home":
          event.preventDefault();
          setActiveIndex(0);
          break;
        case "End":
          event.preventDefault();
          setActiveIndex(flatOptions.length - 1);
          break;
        case "Enter": {
          event.preventDefault();
          const activeProduct = flatOptions[activeIndex];
          if (activeProduct) selectProduct(activeProduct);
          break;
        }
        case "Escape":
          event.preventDefault();
          close();
          triggerRef.current?.focus();
          break;
        case "Tab":
          close();
          break;
        default:
          break;
      }
    },
    [flatOptions, activeIndex, selectProduct, close],
  );

  const handleTriggerKeyDown = useCallback(
    (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    },
    [open],
  );

  return {
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
  };
}
