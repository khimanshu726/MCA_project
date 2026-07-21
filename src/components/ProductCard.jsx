import { Link } from "react-router-dom";
import AddToCartButton from "./AddToCartButton";
import ResponsiveImage from "./ResponsiveImage";
import WishlistButton from "./ui/WishlistButton";
import { warmImageCache } from "../utils/imageUrl";
import { isProductLowStock, isProductOutOfStock } from "../utils/productAvailability";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function ProductCard({ product, className = "" }) {
  // Warm the browser cache for this product's secondary gallery images
  // before the detail page ever mounts — the listing thumbnail only ever
  // requests images[0], so images[1+] would otherwise start loading from
  // zero the moment someone lands on the product page.
  const handlePrefetch = () => warmImageCache(product.images?.slice(1, 4));

  return (
    <article className={`product-card ${className}`.trim()} onMouseEnter={handlePrefetch} onFocus={handlePrefetch}>
      <div className="product-card-media">
        <ResponsiveImage
          src={product.images?.[0]}
          alt={product.name}
          className="card-image"
          aspectClassName="ratio-product"
          width={360}
        />
        <WishlistButton productId={product.id} className="wishlist-toggle-overlay" />
      </div>
      <div className="card-content">
        <div className="card-topline">
          <p className="eyebrow">{product.category}</p>
          {product.badge ? <span className="product-badge">{product.badge}</span> : null}
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-meta-list">
          {product.leadTime ? <span className="meta-pill">{product.leadTime}</span> : null}
          {product.minimumOrderQty ? <span className="meta-pill">MOQ {product.minimumOrderQty}</span> : null}
          {/* The card said nothing about availability, so the first hint you
              got that a product was unbuyable was a zero-priced cart line. */}
          {isProductOutOfStock(product) ? <span className="meta-pill">Out of stock</span> : null}
          {isProductLowStock(product) ? <span className="meta-pill">Only {product.stock} left</span> : null}
        </div>
        <div className="product-card-footer">
          <div className="product-price-block">
            <span>Starting at</span>
            <strong>{currencyFormatter.format(product.price)}</strong>
          </div>
          <div className="card-actions-inline">
            <AddToCartButton product={product} className="mini-link mini-button" />
            <Link className="mini-link" to={`/products/${product.id}`}>
              View details
            </Link>
          </div>
        </div>
      </div>

      {/* Makes the whole card a single click target (image, title, price,
          whitespace) without nesting anchors or altering the layout: an
          absolutely-positioned link stretched over the card, sitting *below*
          the interactive controls (which are lifted above it in CSS), so
          Add to Cart / Wishlist / View details still perform their own action.
          It's a pointer convenience only — aria-hidden and out of the tab
          order — because the visible "View details" link already gives
          keyboard and screen-reader users the same destination, so this adds
          no duplicate stop or announcement. */}
      <Link
        to={`/products/${product.id}`}
        className="product-card-overlay-link"
        aria-hidden="true"
        tabIndex={-1}
      />
    </article>
  );
}

export default ProductCard;
