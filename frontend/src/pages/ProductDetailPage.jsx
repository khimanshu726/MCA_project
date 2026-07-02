import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AddToCartButton from "../components/AddToCartButton";
import ProductGallery from "../components/ProductGallery";
import { getProductById, products } from "../data";

function ProductDetailPage() {
  const { productId } = useParams();
  const product = useMemo(() => getProductById(productId) ?? products[0], [productId]);
  const [activeImage, setActiveImage] = useState(product.images[0]);

  useEffect(() => {
    setActiveImage(product.images[0]);
  }, [product]);

  return (
    <main className="page-stack">
      <section className="detail-layout">
        <ProductGallery
          images={product.images}
          productName={product.name}
          activeImage={activeImage}
          onSelect={setActiveImage}
        />

        <article className="section-panel detail-panel">
          <p className="eyebrow">Product detail</p>
          <h2>{product.name}</h2>
          <p className="detail-price">${product.price}</p>
          <p className="section-copy">{product.description}</p>
          <div className="pill-row">
            <span className="meta-pill">{product.category}</span>
            <span className="meta-pill">3 image gallery</span>
          </div>
          <div className="action-row">
            <Link className="primary-button" to={`/customize/${product.id}`}>
              Customize this product
            </Link>
            <AddToCartButton product={product} className="secondary-button" />
            <Link className="secondary-button" to="/cart">
              View cart
            </Link>
            <Link className="secondary-button" to="/products">
              Back to products
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

export default ProductDetailPage;
