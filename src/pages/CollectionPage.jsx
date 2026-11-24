import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Seo from "../components/Seo";
import ProductCard from "../components/ProductCard";
import { useCollection } from "../hooks/useCollections";
import { useProducts } from "../hooks/useProducts";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const EMPTY_LIST = [];

// Type chips in a stable order: most designs first, then alphabetical.
export const designTypeCounts = (items) => {
  const counts = new Map();
  items.forEach((item) => {
    if (item.designType) counts.set(item.designType, (counts.get(item.designType) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type, count]) => ({ type, count }));
};

/**
 * One collection (e.g. Wedding Invitation Suite) and every design in it, with
 * chips to narrow by design type (?type=Royal). Each design is an ordinary
 * product card leading to its own page.
 */
function CollectionPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = searchParams.get("type") ?? "All";
  const sort = searchParams.get("sort") ?? "featured";

  const { data: collection, isLoading: isCollectionLoading, isError: isCollectionError } = useCollection(slug);
  const {
    data,
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch,
  } = useProducts({ collection: collection?.id, limit: 100, enabled: Boolean(collection?.id) });
  const designs = data?.items ?? EMPTY_LIST;

  const typeChips = useMemo(() => designTypeCounts(designs), [designs]);

  const visibleDesigns = useMemo(() => {
    const filtered = activeType === "All" ? [...designs] : designs.filter((item) => item.designType === activeType);
    if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
    else if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [activeType, designs, sort]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (!value || value === "All" || value === "featured") next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next, { replace: true });
  };

  if (isCollectionLoading) {
    return (
      <main className="page-stack">
        <section className="section-panel" aria-busy="true">
          <span className="skeleton-bar" style={{ width: "30%", height: "0.8rem" }} />
          <span className="skeleton-bar" style={{ width: "60%", height: "2rem" }} />
        </section>
      </main>
    );
  }

  if (isCollectionError || !collection) {
    return (
      <main className="page-stack">
        <Seo title="Collection not found" path={`/collections/${slug}`} noindex />
        <section className="section-panel">
          <div className="empty-state-card">
            <p className="eyebrow">Collection not found</p>
            <h1>This collection isn&rsquo;t available.</h1>
            <Link className="secondary-button" to="/products">
              Browse all products
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-stack">
      <Seo
        title={collection.name}
        description={collection.description || `Browse every ${collection.name} design at Elite Impressions.`}
        path={`/collections/${collection.slug}`}
        image={collection.coverImage}
      />

      {/* Heading, controls and designs in one block: a compact title line
          with the facts beside it, one line of description, then the
          designs, so they start on the first screen. */}
      <section className="section-panel listing-page">
        <div className="listing-head">
          <div className="listing-title-row">
            <h1>{collection.name}</h1>
            {collection.productCount ? (
              <span className="listing-facts">
                {collection.productCount} design{collection.productCount === 1 ? "" : "s"}
                {collection.minPrice == null ? "" : ` · from ${currencyFormatter.format(collection.minPrice)}`}
              </span>
            ) : null}
          </div>
          {collection.description ? <p className="listing-desc">{collection.description}</p> : null}
        </div>

        {/* One slim row above the designs: type chips (or the count) on the
            left, a small sort control on the right. */}
        <div className="listing-bar">
          {typeChips.length > 1 ? (
            <div className="category-chip-row" role="group" aria-label="Design types">
              {[{ type: "All", count: designs.length }, ...typeChips].map(({ type, count }) => (
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
          ) : (
            <p className="listing-count">
              <strong>{visibleDesigns.length}</strong> design{visibleDesigns.length === 1 ? "" : "s"}
            </p>
          )}
          <div className="listing-sort">
            <label htmlFor="collection-sort">Sort by</label>
            <select id="collection-sort" value={sort} onChange={(event) => updateParams({ sort: event.target.value })}>
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {isProductsLoading ? (
          <p className="section-copy">Loading designs…</p>
        ) : isProductsError ? (
          <div className="empty-state-card">
            <p className="eyebrow">Something went wrong</p>
            <h3>We couldn&rsquo;t load the designs.</h3>
            <button type="button" className="secondary-button" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {visibleDesigns.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {!visibleDesigns.length ? (
              <div className="empty-state-card">
                <p className="eyebrow">No designs here yet</p>
                <h3>
                  {activeType !== "All" ? "Try another type, or see all designs." : "New designs are on the way."}
                </h3>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

export default CollectionPage;
