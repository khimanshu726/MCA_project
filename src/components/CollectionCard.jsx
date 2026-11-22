import { Link } from "react-router-dom";
import ResponsiveImage from "./ResponsiveImage";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * A collection (e.g. Wedding Invitation Suite) in a product grid: one card
 * standing in for all of its designs, leading to the collection page. Uses
 * the product card's layout so it sits naturally among products.
 */
function CollectionCard({ collection, className = "" }) {
  const href = `/collections/${collection.slug}`;
  const count = collection.productCount || 0;

  return (
    <article className={`product-card collection-card ${className}`.trim()}>
      <div className="product-card-media">
        <ResponsiveImage
          src={collection.coverImage}
          alt={collection.name}
          className="card-image"
          aspectClassName="ratio-product"
          width={360}
        />
      </div>
      <div className="card-content">
        <div className="card-topline">
          <p className="eyebrow">{collection.category}</p>
          <span className="product-badge">Collection</span>
        </div>
        <h3>{collection.name}</h3>
        {collection.description ? <p className="product-desc">{collection.description}</p> : null}
        <div className="product-meta-list">
          <span className="meta-pill">
            {count} design{count === 1 ? "" : "s"}
          </span>
        </div>
        <div className="product-card-footer">
          <div className="product-price-block">
            <span>Starting at</span>
            <strong>{collection.minPrice == null ? "—" : currencyFormatter.format(collection.minPrice)}</strong>
          </div>
          <div className="card-actions-inline">
            <Link className="mini-link mini-button" to={href}>
              See all designs
            </Link>
          </div>
        </div>
      </div>
      {/* Whole-card click target, as on ProductCard; the visible link above is
          the keyboard / screen-reader route. */}
      <Link to={href} className="product-card-overlay-link" aria-hidden="true" tabIndex={-1} />
    </article>
  );
}

export default CollectionCard;
