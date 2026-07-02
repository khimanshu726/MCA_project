import { Link } from "react-router-dom";
import AddToCartButton from "./AddToCartButton";
import ResponsiveImage from "./ResponsiveImage";

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <ResponsiveImage
        src={product.images[0]}
        alt={product.name}
        className="card-image"
        aspectClassName="ratio-product"
      />
      <div className="card-content">
        <div className="card-topline">
          <p className="eyebrow">{product.category}</p>
          {product.badge ? <span className="product-badge">{product.badge}</span> : null}
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-meta-list">
          {product.leadTime ? <span className="meta-pill">{product.leadTime}</span> : null}
          {product.minimum ? <span className="meta-pill">{product.minimum}</span> : null}
        </div>
        <div className="product-card-footer">
          <div className="product-price-block">
            <span>Starting at</span>
            <strong>${product.price}</strong>
          </div>
          <div className="card-actions-inline">
            <AddToCartButton product={product} className="mini-link mini-button" />
            <Link className="mini-link" to={`/products/${product.id}`}>
              View details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
