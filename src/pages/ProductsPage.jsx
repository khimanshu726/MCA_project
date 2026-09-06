import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import Seo from "../components/Seo";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";

const categoryOptionsFromItems = (items) => ["All", ...new Set(items.map((product) => product.category))];
const SEARCH_DEBOUNCE_MS = 300;

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "All";
  const query = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "featured";

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

  const { data, isLoading, isError, refetch } = useProducts({ category, q: query, limit: 100 });
  const items = data?.items ?? [];

  // Fetched independently of the active category filter so the chip row
  // doesn't collapse to a single option once a category is selected.
  const { data: allProductsData } = useProducts({ limit: 100 });
  const categoryOptions = useMemo(
    () => categoryOptionsFromItems(allProductsData?.items ?? []),
    [allProductsData],
  );

  const visibleProducts = useMemo(() => {
    const sortedProducts = [...items];

    if (sort === "price-low") {
      sortedProducts.sort((first, second) => first.price - second.price);
    } else if (sort === "price-high") {
      sortedProducts.sort((first, second) => second.price - first.price);
    } else if (sort === "name") {
      sortedProducts.sort((first, second) => first.name.localeCompare(second.name));
    }

    return sortedProducts;
  }, [items, sort]);

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
          title={category}
          description={`Shop custom ${category.toLowerCase()} at Elite Impressions — design online, order in bulk, and reorder fast.`}
          path={`/products?category=${encodeURIComponent(category)}`}
        />
      ) : (
        <Seo
          title="Shop All Print Products"
          description="Browse Elite Impressions' full catalog — business cards, marketing materials, banners, invitations, packaging, merchandise, and institutional supplies."
          path="/products"
        />
      )}
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Product catalog</p>
          <h1>Browse print products the way customers expect to shop them.</h1>
          <p className="section-copy">
            Search by product type, narrow by category, and sort the catalog by pricing or alphabetical order.
          </p>
        </div>

        <div className="catalog-toolbar">
          <div className="catalog-search">
            <label className="field-label" htmlFor="catalog-search">
              Search catalog
            </label>
            <div className="catalog-search-field">
              <Search size={16} className="catalog-search-icon" aria-hidden="true" />
              <input
                id="catalog-search"
                type="search"
                value={searchInput}
                placeholder="Search visiting cards, banners, packaging..."
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <div className="catalog-sort">
            <label className="field-label" htmlFor="catalog-sort">
              Sort by
            </label>
            <select id="catalog-sort" value={sort} onChange={(event) => updateParams({ sort: event.target.value })}>
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        <div className="category-chip-row" aria-label="Catalog categories">
          {categoryOptions.map((option) => {
            const isActive = option === category;

            return (
              <button
                key={option}
                type="button"
                className={`category-chip ${isActive ? "active" : ""}`}
                onClick={() => updateParams({ category: option })}
              >
                {option}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          // Card-shaped skeletons that mirror the real .product-card (4/3 media +
          // content), so the grid doesn't jump when products arrive — the catalog
          // is the busiest page and previously showed a bare "Loading…" line.
          <div className="product-grid" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <article key={index} className="product-card">
                <div className="product-card-media">
                  <div className="image-shell ratio-product">
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
            <div className="results-summary">
              <strong>{visibleProducts.length}</strong> product{visibleProducts.length === 1 ? "" : "s"} available
              {category !== "All" ? ` in ${category}` : ""}
              {query ? ` for "${query}"` : ""}
            </div>

            <div className="product-grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {!visibleProducts.length ? (
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
