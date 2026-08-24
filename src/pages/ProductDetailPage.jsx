import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShieldCheck, Truck, Store, Clock } from "lucide-react";
import Seo, { SITE_URL } from "../components/Seo";
import AddToCartButton from "../components/AddToCartButton";
import BuyNowButton from "../components/BuyNowButton";
import ProductGallery from "../components/ProductGallery";
import ProductRail from "../components/cart/ProductRail";
import WishlistButton from "../components/ui/WishlistButton";
import { useProduct } from "../hooks/useProduct";
import { useProducts } from "../hooks/useProducts";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { isProductLowStock, isProductOutOfStock } from "../utils/productAvailability";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const fmt = (value) => currencyFormatter.format(value || 0);

const TRUST = [
  { icon: ShieldCheck, label: "Secure checkout", detail: "Encrypted payments" },
  { icon: Truck, label: "Pan-India shipping", detail: "+ local delivery in Purnia" },
  { icon: Store, label: "Store pickup", detail: "At our Purnia shop" },
];

function DetailSkeleton() {
  return (
    <main className="page-stack">
      <section className="detail-layout">
        <div className="image-shell ratio-square detail-skeleton-media">
          <div className="image-skeleton" aria-hidden="true" />
        </div>
        <article className="section-panel detail-panel" aria-hidden="true">
          <span className="skeleton-bar" style={{ width: "35%", height: "0.8rem" }} />
          <span className="skeleton-bar" style={{ width: "80%", height: "2rem" }} />
          <span className="skeleton-bar" style={{ width: "40%", height: "1.5rem" }} />
          <span className="skeleton-bar" style={{ width: "100%" }} />
          <span className="skeleton-bar" style={{ width: "92%" }} />
          <span className="skeleton-bar" style={{ width: "60%" }} />
        </article>
      </section>
    </main>
  );
}

function ProductDetailPage() {
  const { productId } = useParams();
  const { data: product, isLoading, isError } = useProduct(productId);
  const { data: relatedData } = useProducts({ category: product?.category, limit: 12 });
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
    return <DetailSkeleton />;
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

  const outOfStock = isProductOutOfStock(product);
  const lowStock = isProductLowStock(product);
  const hasDiscount = product.mrp > product.price;
  const related = (relatedData?.items ?? []).filter((entry) => entry.id !== product.id).slice(0, 8);

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
      availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
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
          <Link className="eyebrow detail-category-link" to={`/products?category=${encodeURIComponent(product.category)}`}>
            {product.category}
          </Link>
          <h1>{product.name}</h1>

          {/* Price with MRP + discount so the value reads at a glance. */}
          <div className="detail-price-block">
            <strong className="detail-price">{fmt(product.price)}</strong>
            {hasDiscount ? (
              <>
                <span className="detail-mrp">{fmt(product.mrp)}</span>
                <span className="detail-discount">{product.discountPercent}% off</span>
              </>
            ) : null}
          </div>
          {hasDiscount ? <p className="detail-savings">You save {fmt(product.mrp - product.price)}</p> : null}

          {/* Availability + lead time, stated together rather than hidden in a pill. */}
          <p className={`detail-availability ${outOfStock ? "is-out" : lowStock ? "is-low" : "is-in"}`}>
            <Clock size={15} strokeWidth={1.8} aria-hidden="true" />
            {outOfStock ? "Out of stock" : lowStock ? `Only ${product.stock} left` : "In stock"}
            {product.leadTime ? ` · ${product.leadTime}` : ""}
            {product.minimumOrderQty ? ` · MOQ ${product.minimumOrderQty}` : ""}
          </p>

          <p className="section-copy">{product.description}</p>

          {product.materials?.length ? (
            <div className="detail-specs">
              <h2 className="detail-specs-heading">Finishes &amp; options</h2>
              <ul className="detail-specs-list">
                {product.materials.map((material) => (
                  <li key={material}>{material}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* The two purchase actions get their own equal-width row so neither
              reads as secondary to the other, and so they stack cleanly on a
              phone instead of wrapping mid-row with the navigation links. */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AddToCartButton product={product} variant="secondary" size="lg" className="w-full" />
            <BuyNowButton product={product} size="lg" className="w-full" />
          </div>

          <div className="action-row detail-secondary-actions">
            <Link className="primary-button" to={`/customize/${product.id}`}>
              Customize this product
            </Link>
            <WishlistButton productId={product.id} className="wishlist-toggle-inline" />
            <Link className="secondary-button" to="/cart">
              View cart
            </Link>
          </div>

          {/* Trust row — the real fulfilment facts, near the buy actions. */}
          <ul className="detail-trust">
            {TRUST.map(({ icon: Icon, label, detail }) => (
              <li key={label}>
                <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                  <em>{detail}</em>
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {related.length > 0 ? (
        <section className="section-panel">
          <ProductRail title={`More in ${product.category}`} products={related} />
        </section>
      ) : null}
    </main>
  );
}

export default ProductDetailPage;
