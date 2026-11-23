import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ResponsiveImage from "./ResponsiveImage";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * A slim link to a collection, shown above a category's designs: the designs
 * themselves are listed in the grid below, so the collection is offered as a
 * way to browse them together (with its type filters) rather than as a card
 * hiding them.
 */
function CollectionBanner({ collection }) {
  const count = collection.productCount || 0;

  return (
    <Link className="collection-banner" to={`/collections/${collection.slug}`}>
      <span className="collection-banner-media">
        <ResponsiveImage src={collection.coverImage} alt="" aspectClassName="ratio-square" width={96} />
      </span>
      <span className="collection-banner-text">
        <span className="collection-banner-eyebrow">Collection</span>
        <strong>{collection.name}</strong>
        <span className="collection-banner-meta">
          {count} design{count === 1 ? "" : "s"}
          {collection.minPrice == null ? "" : ` · from ${currencyFormatter.format(collection.minPrice)}`}
        </span>
      </span>
      <span className="collection-banner-cta">
        Browse collection <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}

export default CollectionBanner;
