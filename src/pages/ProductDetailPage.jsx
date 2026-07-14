import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AddToCartButton from "../components/AddToCartButton";
import ProductGallery from "../components/ProductGallery";
import { useProduct } from "../hooks/useProduct";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function ProductDetailPage() {
  const { productId } = useParams();
  const { data: product, isLoading, isError } = useProduct(productId);
  const [activeImage, setActiveImage] = useState(null);
  const { recordView } = useRecentlyViewed();

  useEffect(() => {
    if (product?.images?.[0]) {
      setActiveImage(product.images[0]);
    }
  }, [product]);

  useEffect(() => {
    if (product?.id) {
      recordView(product.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (isLoading) {
    return (
      <main className="page-stack">
        <section className="section-panel">
          <p className="section-copy">Loading product&hellip;</p>
        </section>
      </main>
    );
  }

  if (isError || !product) {
    return (
      <main className="page-stack">
        <section className="empty-state-card">
          <p className="eyebrow">Product not found</p>
          <h3>This product may have been removed or is no longer available.</h3>
          <Link className="secondary-button" to="/products">
            Back to products
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-stack">
      <section className="detail-layout">
        <ProductGallery
          images={product.images}
          productName={product.name}
          activeImage={activeImage ?? product.images[0]}
          onSelect={setActiveImage}
        />

        <article className="section-panel detail-panel">
          <p className="eyebrow">Product detail</p>
          <h2>{product.name}</h2>
          <p className="detail-price">{currencyFormatter.format(product.price)}</p>
          <p className="section-copy">{product.description}</p>
          <div className="pill-row">
            <span className="meta-pill">{product.category}</span>
            <span className="meta-pill">{product.images.length} preview images</span>
            {product.minimumOrderQty ? <span className="meta-pill">MOQ {product.minimumOrderQty}</span> : null}
            {product.stock <= 0 ? <span className="meta-pill">Out of stock</span> : null}
          </div>
          <div className="action-row">
            <Link className="primary-button" to={`/customize/${product.id}`}>
              Customize this product
            </Link>
            <AddToCartButton product={product} className="secondary-button" />
            <Link className="secondary-button" to="/cart">
              View cart
            </Link>
            <Link className="ghost-button" to="/products">
              Back to products
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

export default ProductDetailPage;
