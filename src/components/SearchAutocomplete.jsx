import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, TrendingUp } from "lucide-react";
import { useProducts } from "../hooks/useProducts";
import { useRecentSearches } from "../hooks/useRecentSearches";
import { buildSearchDocument, searchDocuments, getHighlightSegments } from "../utils/productSearch";
import { getOptimizedImageUrl } from "../utils/imageUrl";
import { POPULAR_SEARCHES, EMPTY_STATE_SUGGESTIONS } from "../config/searchSuggestions";

const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 6;
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Renders text with the query's matching parts emphasised. */
function HighlightedText({ text, query }) {
  const segments = useMemo(() => getHighlightSegments(text, query), [text, query]);
  return segments.map((segment, index) =>
    segment.match ? <mark key={index}>{segment.text}</mark> : <span key={index}>{segment.text}</span>,
  );
}

function SearchAutocomplete({ searchTerm, onSearchTermChange }) {
  const navigate = useNavigate();
  const { recents, addRecentSearch } = useRecentSearches();
  // The whole catalogue, fetched once and cached by React Query, so matching is
  // instant. Building the search documents is memoised so it never re-runs per
  // keystroke.
  const { data } = useProducts({ limit: 500 });
  const products = data?.items ?? [];
  const documents = useMemo(() => products.map(buildSearchDocument), [products]);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  const containerRef = useRef(null);
  const listboxId = useId();
  const trimmed = searchTerm.trim();

  // Debounce the term used for matching (not the input value, which stays live).
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTerm(searchTerm), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const matches = useMemo(() => {
    const q = debouncedTerm.trim();
    if (!q) return [];
    return searchDocuments(documents, q, { limit: 20 });
  }, [documents, debouncedTerm]);

  const suggestions = matches.slice(0, MAX_SUGGESTIONS);
  const hasMore = matches.length > MAX_SUGGESTIONS;
  // The matcher has "caught up" with what the user typed — used so the empty
  // state only shows after a real search, never during the debounce window.
  const settled = debouncedTerm.trim() === trimmed;
  const isEmptyState = trimmed.length > 0 && settled && matches.length === 0;

  const goToProduct = useCallback(
    (product) => {
      onSearchTermChange(product.name);
      addRecentSearch(product.name);
      setIsOpen(false);
      navigate(`/products/${product.id}`);
    },
    [navigate, onSearchTermChange, addRecentSearch],
  );

  const goToResults = useCallback(
    (term) => {
      const value = String(term).trim();
      if (!value) return;
      onSearchTermChange(value);
      addRecentSearch(value);
      setIsOpen(false);
      navigate(`/products?q=${encodeURIComponent(value)}`);
    },
    [navigate, onSearchTermChange, addRecentSearch],
  );

  // A single flat list of navigable options, so the keyboard handler is
  // section-agnostic and indices line up with aria-activedescendant.
  const options = useMemo(() => {
    if (trimmed.length === 0) {
      return [
        ...recents.map((term) => ({ key: `recent-${term}`, kind: "recent", term, onSelect: () => goToResults(term) })),
        ...POPULAR_SEARCHES.map((term) => ({ key: `popular-${term}`, kind: "popular", term, onSelect: () => goToResults(term) })),
      ];
    }
    if (matches.length > 0) {
      const rows = suggestions.map((product) => ({ key: `product-${product.id}`, kind: "product", product, onSelect: () => goToProduct(product) }));
      if (hasMore) rows.push({ key: "view-all", kind: "viewAll", onSelect: () => goToResults(trimmed) });
      return rows;
    }
    if (isEmptyState) {
      return EMPTY_STATE_SUGGESTIONS.map((term) => ({ key: `empty-${term}`, kind: "empty", term, onSelect: () => goToResults(term) }));
    }
    return [];
  }, [trimmed, recents, matches, suggestions, hasMore, isEmptyState, goToResults, goToProduct]);

  const showDropdown = isOpen && options.length > 0;

  // Close on outside click.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  // Reset the highlight when the option set meaningfully changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedTerm, isOpen]);

  // Keep the active row scrolled into view.
  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-option-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (options.length ? Math.min(index + 1, options.length - 1) : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    } else if (event.key === "Tab") {
      if (showDropdown && activeIndex >= 0 && options[activeIndex]) {
        event.preventDefault();
        options[activeIndex].onSelect();
      } else {
        setIsOpen(false);
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (showDropdown && activeIndex >= 0 && options[activeIndex]) {
      options[activeIndex].onSelect();
    } else {
      goToResults(searchTerm);
    }
  };

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  const renderOption = (option, index) => {
    const isActive = index === activeIndex;
    const shared = {
      id: `${listboxId}-opt-${index}`,
      "data-option-index": index,
      role: "option",
      "aria-selected": isActive,
      onMouseEnter: () => setActiveIndex(index),
      onClick: option.onSelect,
    };

    if (option.kind === "product") {
      const { product } = option;
      return (
        <li key={option.key} {...shared} className={`search-suggestion search-suggestion-product${isActive ? " is-active" : ""}`}>
          <img
            className="search-suggestion-thumb"
            src={getOptimizedImageUrl(product.images?.[0], { width: 96 })}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <span className="search-suggestion-body">
            <span className="search-suggestion-name">
              <HighlightedText text={product.name} query={debouncedTerm} />
            </span>
            <span className="search-suggestion-meta">{product.category}</span>
          </span>
          <span className="search-suggestion-price">Starting {currency.format(product.price)}</span>
        </li>
      );
    }

    if (option.kind === "viewAll") {
      return (
        <li key={option.key} {...shared} className={`search-suggestion search-suggestion-viewall${isActive ? " is-active" : ""}`}>
          <Search size={15} strokeWidth={1.9} aria-hidden="true" />
          <span>
            View all results for “<strong>{trimmed}</strong>”
          </span>
        </li>
      );
    }

    const Icon = option.kind === "recent" ? Clock : Search;
    return (
      <li key={option.key} {...shared} className={`search-suggestion search-suggestion-term${isActive ? " is-active" : ""}`}>
        <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>{option.term}</span>
      </li>
    );
  };

  return (
    <form className="header-search" onSubmit={handleSubmit} role="search" ref={containerRef}>
      <label className="search-label" htmlFor="store-search">
        Search products
      </label>
      <div className="search-field-row">
        <input
          id="store-search"
          type="search"
          placeholder="Search cards, flyers, banners, mugs..."
          value={searchTerm}
          onChange={(event) => {
            onSearchTermChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          autoComplete="off"
          aria-label="Search products"
        />
        <button type="submit" className="primary-button search-submit">
          Search
        </button>

        {showDropdown ? (
          // onMouseDown preventDefault keeps input focus so a click selects
          // before the input's blur can close the panel.
          <div className="search-suggestions" role="presentation" onMouseDown={(event) => event.preventDefault()}>
            <ul id={listboxId} role="listbox" aria-label="Search suggestions" className="search-suggestions-list">
              {trimmed.length === 0
                ? options.flatMap((option, index) => {
                    const rows = [];
                    if (index === 0 && recents.length > 0) {
                      rows.push(
                        <li key="heading-recent" className="search-suggestions-heading" role="presentation">
                          <Clock size={13} strokeWidth={1.8} aria-hidden="true" /> Recent searches
                        </li>,
                      );
                    }
                    if (index === recents.length) {
                      rows.push(
                        <li key="heading-popular" className="search-suggestions-heading" role="presentation">
                          <TrendingUp size={13} strokeWidth={1.8} aria-hidden="true" /> Popular searches
                        </li>,
                      );
                    }
                    rows.push(renderOption(option, index));
                    return rows;
                  })
                : isEmptyState
                  ? [
                      <li key="empty-heading" className="search-suggestions-empty" role="presentation">
                        No products found. Try searching for:
                      </li>,
                      ...options.map((option, index) => renderOption(option, index)),
                    ]
                  : options.map((option, index) => renderOption(option, index))}
            </ul>
          </div>
        ) : null}
      </div>
    </form>
  );
}

export default SearchAutocomplete;
