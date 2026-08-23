import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo, { SITE_URL } from "../components/Seo";
import AddToCartButton from "../components/AddToCartButton";
import BuyNowButton from "../components/BuyNowButton";
import ProductGallery from "../components/ProductGallery";
import WishlistButton from "../components/ui/WishlistButton";
import { useProduct } from "../hooks/useProduct";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { isProductLowStock, isProductOutOfStock } from "../utils/productAvailability";

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

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    category: product.category,
    sku: product.sku || product.id,
    brand: { "@type": "Brand", name: "Elite Impressions" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      url: `${SITE_URL}/products/${product.id}`,
      availability: isProductOutOfStock(product)
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <main className="page-stack">
      <Seo
        title={product.name}
        description={product.description}
        path={`/products/${product.id}`}
        image={product.images?.[0]}
        type="product"
        jsonLd={productJsonLd}
      />
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
            {/* `stock <= 0` was too lenient: a product with stock below its own
                MOQ is equally unbuyable, and this page said nothing while the
                cart called it out of stock. */}
            {isProductOutOfStock(product) ? <span className="meta-pill">Out of stock</span> : null}
            {isProductLowStock(product) ? (
              <span className="meta-pill">Only {product.stock} left</span>
            ) : null}
          </div>
          {/* The two purchase actions get their own equal-width row so neither
              reads as secondary to the other, and so they stack cleanly on a
              phone instead of wrapping mid-row with the navigation links. */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AddToCartButton product={product} variant="secondary" size="lg" className="w-full" />
            <BuyNowButton product={product} size="lg" className="w-full" />
          </div>

          <div className="action-row">
            <Link className="primary-button" to={`/customize/${product.id}`}>
              Customize this product
            </Link>
            <WishlistButton productId={product.id} className="wishlist-toggle-inline" />
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
