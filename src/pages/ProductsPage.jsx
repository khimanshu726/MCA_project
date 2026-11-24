import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import Seo from "../components/Seo";
import ProductCard from "../components/ProductCard";
import CollectionCard from "../components/CollectionCard";
import { useProducts } from "../hooks/useProducts";
import { useCollections } from "../hooks/useCollections";
import { designTypeCounts } from "./CollectionPage";
import { categoryInfo, categoryLabel, categoryMenu } from "../data";

// Stable fallback so memoised values depending on the list don't recompute
// on every render while the query is still loading.
const EMPTY_LIST = [];

// Categories that have something to buy, in the header's order, each under
// its customer-facing name. Anything not in the menu goes last.
export const categoryOptionsFromItems = (items) => {
  const present = new Set(items.map((product) => product.category).filter(Boolean));
  const known = categoryMenu.filter((item) => present.has(item.category)).map((item) => item.category);
  const extra = [...present].filter((category) => !known.includes(category)).sort();
  return [...known, ...extra].map((category) => ({ value: category, label: categoryLabel(category) }));
};
const SEARCH_DEBOUNCE_MS = 300;

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "All";
  const query = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "featured";
  const activeType = searchParams.get("type") ?? "All";

  // The search box updates its own local state on every keystroke (so
  // typing never feels laggy) but only pushes into the URL — and therefore
  // into useProducts' queryKey — after the user pauses. Without this, every
  // keystroke fired a brand-new query; the product grid would re-diff by
  // key on each response, unmounting/remounting any card not in both the
  // old and new result sets and re-triggering its ResponsiveImage skeleton,
  // which is what "images disappear/reload while searching" actually was.
  const [searchInput, setSearchInput] = useState(query);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => () => clearTimeout(searchDebounceRef.current), []);

  // A category page (e.g. Wedding Cards) lists every design straight away,
  // including those inside its collections. "All products" keeps one card
  // per collection so fifty wedding cards don't flood it. A search finds
  // designs one by one.
  const isCategoryView = category !== "All" && !query;
  const { data, isLoading, isError, refetch } = useProducts({
    category,
    q: query,
    limit: 100,
    excludeCollected: !isCategoryView,
    withCollectionDesigns: isCategoryView,
  });
  const items = data?.items ?? EMPTY_LIST;
  // Collections appear as one card each on All products only; a category page
  // simply lists every design (each design links back to its collection).
  const { data: collections = EMPTY_LIST } = useCollections({ category, enabled: !query && !isCategoryView });
  const visibleCollections = query || isCategoryView ? EMPTY_LIST : collections;

  // Fetched independently of the active category filter so the chip row
  // doesn't collapse to a single option once a category is selected.
  const { data: allProductsData } = useProducts({ limit: 100 });
  const categoryOptions = useMemo(
    () => categoryOptionsFromItems(allProductsData?.items ?? []),
    [allProductsData],
  );

  // A category page narrows by design type (Royal, Floral…) when its designs
  // have more than one; the category itself is chosen in the header.
  const typeChips = useMemo(() => (isCategoryView ? designTypeCounts(items) : EMPTY_LIST), [isCategoryView, items]);
  const typeFilter = typeChips.length > 1 && activeType !== "All" ? activeType : null;

  const visibleProducts = useMemo(() => {
    const sortedProducts = typeFilter ? items.filter((item) => item.designType === typeFilter) : [...items];

    if (sort === "price-low") {
      sortedProducts.sort((first, second) => first.price - second.price);
    } else if (sort === "price-high") {
      sortedProducts.sort((first, second) => second.price - first.price);
    } else if (sort === "name") {
      sortedProducts.sort((first, second) => first.name.localeCompare(second.name));
    }

    return sortedProducts;
  }, [items, sort, typeFilter]);

  const resultCount = visibleProducts.length + visibleCollections.length;
  const isAll = category === "All";
  const label = isAll ? "All products" : categoryLabel(category);
  const intro = isAll
    ? "Business cards, wedding cards, packaging and more: designed online, printed in Purnia, delivered across India."
    : categoryInfo(category)?.description || `Custom ${label.toLowerCase()}, designed online and printed to order.`;

  const updateParams = (changes) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
      if (!value || value === "All" || value === "featured") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams);
  };

  const handleSearchChange = (event) => {
    const nextValue = event.target.value;
    setSearchInput(nextValue);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => updateParams({ q: nextValue }), SEARCH_DEBOUNCE_MS);
  };

  return (
    <main className="page-stack">
      {category && category !== "All" ? (
        <Seo
          title={label}
          description={`Shop custom ${label.toLowerCase()} at Elite Impressions — design online, order in bulk, and reorder fast.`}
          path={`/products?category=${encodeURIComponent(category)}`}
        />
      ) : (
        <Seo
          title="Shop All Print Products"
          description="Browse Elite Impressions' full catalog — business cards, marketing materials, banners, invitations, packaging, merchandise, and institutional supplies."
          path="/products"
        />
      )}
      <section className="section-panel listing-page">
        {/* A compact title line with the result count beside it, one line of
            description, then one slim row of controls, so products start on
            the first screen. */}
        <div className="listing-head">
          <div className="listing-title-row">
            <h1>{label}</h1>
            {!isLoading && !isError ? (
              <span className="listing-facts">
                {resultCount} {resultCount === 1 ? "result" : "results"}
                {typeFilter ? ` · ${typeFilter}` : ""}
                {query ? ` for "${query}"` : ""}
              </span>
            ) : null}
          </div>
          <p className="listing-desc">{intro}</p>
        </div>

        <div className={`listing-bar${isAll ? " is-all" : ""}`}>
          <div className="listing-search">
            <Search size={16} aria-hidden="true" />
            <input
              id="catalog-search"
              type="search"
              aria-label="Search catalog"
              value={searchInput}
              placeholder="Search visiting cards, banners, packaging..."
              onChange={handleSearchChange}
            />
          </div>

          {isAll ? (
            <div className="listing-sort">
              <label htmlFor="catalog-category">Category</label>
              <select
                id="catalog-category"
                value="All"
                onChange={(event) => updateParams({ category: event.target.value, type: "" })}
              >
                <option value="All">All categories</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="listing-sort">
            <label htmlFor="catalog-sort">Sort by</label>
            <select id="catalog-sort" value={sort} onChange={(event) => updateParams({ sort: event.target.value })}>
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {typeChips.length > 1 ? (
          <div className="category-chip-row" role="group" aria-label="Design types">
            {[{ type: "All", count: items.length }, ...typeChips].map(({ type, count }) => (
              <button
                key={type}
                type="button"
                aria-pressed={type === activeType}
                className={`category-chip ${type === activeType ? "active" : ""}`}
                onClick={() => updateParams({ type })}
              >
                {type} <span className="chip-count">{count}</span>
              </button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          // Card-shaped skeletons that mirror the real .product-card (4/3 media +
          // content), so the grid doesn't jump when products arrive — the catalog
          // is the busiest page and previously showed a bare "Loading…" line.
          <div className="product-grid" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <article key={index} className="product-card">
                <div className="product-card-media">
                  <div className="image-shell ratio-square">
                    <div className="image-skeleton" />
                  </div>
                </div>
                <div className="card-content">
                  <span className="skeleton-bar" style={{ width: "38%", height: "0.7rem" }} />
                  <span className="skeleton-bar" style={{ width: "82%", height: "1.15rem" }} />
                  <span className="skeleton-bar" style={{ width: "100%" }} />
                  <span className="skeleton-bar" style={{ width: "46%", height: "1.25rem" }} />
                </div>
              </article>
            ))}
          </div>
        ) : isError ? (
          <div className="empty-state-card">
            <p className="eyebrow">Something went wrong</p>
            <h3>We couldn&rsquo;t load the catalog.</h3>
            <button type="button" className="secondary-button" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {visibleCollections.map((collection) => (
                <CollectionCard key={`collection-${collection.id}`} collection={collection} />
              ))}
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {!visibleProducts.length && !visibleCollections.length ? (
              <div className="empty-state-card">
                <p className="eyebrow">No products found</p>
                <h3>Try a broader category or a shorter search term.</h3>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

export default ProductsPage;
