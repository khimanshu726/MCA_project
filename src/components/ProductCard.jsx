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
        <p className="eyebrow">{product.category}</p>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-card-footer">
          <strong>${product.price}</strong>
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
