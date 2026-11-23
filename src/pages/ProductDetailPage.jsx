import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShieldCheck, Truck, Store, Clock } from "lucide-react";
import Seo, { SITE_URL } from "../components/Seo";
import AddToCartButton from "../components/AddToCartButton";
import BuyNowButton from "../components/BuyNowButton";
import ProductGallery from "../components/ProductGallery";
import ProductRail from "../components/cart/ProductRail";
import QuantitySelector from "../components/ui/QuantitySelector";
import WishlistButton from "../components/ui/WishlistButton";
import BulkPricingTable from "../components/BulkPricingTable";
import MobileBuyBar from "../components/MobileBuyBar";
import { useProduct } from "../hooks/useProduct";
import { useProducts } from "../hooks/useProducts";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import {
  getDefaultOrderQty,
  getMinimumOrderQty,
  getQuantityStep,
  snapQuantity,
  isProductLowStock,
  isProductOutOfStock,
} from "../utils/productAvailability";
import { getUnitPrice } from "../utils/tierPricing";
import { formatLeadTime } from "../utils/leadTime";

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

// Price with MRP + discount so the value reads at a glance. Rendered twice on
// phones (the summary above the gallery and, visually hidden, in the buy
// panel); both copies get the same numbers.
function DetailPrice({ unitPrice, isBulkPrice, hasDiscount, mrp, discountPercent }) {
  return (
    <>
      <div className="detail-price-block">
        <strong className="detail-price">{fmt(unitPrice)}</strong>
        {isBulkPrice ? <span className="detail-discount">Bulk price</span> : null}
        {hasDiscount ? (
          <>
            <span className="detail-mrp">{fmt(mrp)}</span>
            <span className="detail-discount">{discountPercent}% off</span>
          </>
        ) : null}
      </div>
      {hasDiscount ? <p className="detail-savings">You save {fmt(mrp - unitPrice)} per unit</p> : null}
    </>
  );
}

// True while the element is off screen. Without IntersectionObserver (old
// browsers, tests) it reports off screen, so the sticky bar is simply always
// available on phones.
function useIsOffScreen(ref) {
  const [isOffScreen, setIsOffScreen] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window.IntersectionObserver !== "function") return undefined;
    const observer = new window.IntersectionObserver(([entry]) => setIsOffScreen(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  });
  return isOffScreen;
}

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
  // A design in a collection suggests its sibling designs; anything else, its
  // category. (The collection is only attached while it's live.)
  const collection = product?.collection ?? null;
  const { data: relatedData } = useProducts(
    collection ? { collection: collection.id, limit: 24 } : { category: product?.category, limit: 12 },
  );
  const [activeImage, setActiveImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  // The sticky phone buy bar shows only while the page's own buy buttons are
  // scrolled out of view.
  const buyButtonsRef = useRef(null);
  const buyButtonsOffScreen = useIsOffScreen(buyButtonsRef);
  const { recordView } = useRecentlyViewed();

  useEffect(() => {
    if (product?.images?.[0]) {
      setActiveImage(product.images[0]);
    }
  }, [product]);

  // Reset the chosen quantity to the product's default (its MOQ) whenever the
  // product changes — e.g. navigating between items via the related rail.
  useEffect(() => {
    if (product) {
      setQuantity(getDefaultOrderQty(product));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

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
        {/* Without this the page kept the generic site title and was indexable.
            The server answers unknown product URLs with a 404 status as well. */}
        <Seo title="Product not found" path={`/products/${productId}`} noindex />
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
  // Volume pricing: the price shown follows the quantity selected below.
  const unitPrice = getUnitPrice(product, quantity);
  const isBulkPrice = unitPrice < Number(product.price);
  const hasDiscount = product.mrp > unitPrice;
  const discountPercent = hasDiscount ? Math.round(((product.mrp - unitPrice) / product.mrp) * 100) : 0;
  // Quantity bounds mirror the cart's rules: floor at the product's MOQ, ceiling
  // at what's actually in stock. Only offer the stepper when there's a real range
  // to choose from — a fixed-MOQ product just uses that quantity.
  const minQty = getMinimumOrderQty(product);
  const qtyStep = getQuantityStep(product);
  // The most that can be ordered on the product's step grid within stock.
  const maxQty = snapQuantity(Math.max(minQty, Number(product.stock) || minQty), { min: minQty, step: qtyStep }, "down");
  const showStepper = !outOfStock && maxQty > minQty;
  // A bulk range can start off the step grid; pick the first allowed quantity in it.
  const selectBulkQuantity = (next) =>
    setQuantity(snapQuantity(next, { min: minQty, max: maxQty, step: qtyStep }, "up"));
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
        {/* Phones: name and price above the gallery, so they're on the first
            screen. aria-hidden because the real <h1> and price are in the buy
            panel below (visually hidden there on phones). Hidden on desktop. */}
        <div className="detail-mobile-summary" aria-hidden="true">
          <p className="detail-mobile-title">{product.name}</p>
          <DetailPrice
            unitPrice={unitPrice}
            isBulkPrice={isBulkPrice}
            hasDiscount={hasDiscount}
            mrp={product.mrp}
            discountPercent={discountPercent}
          />
        </div>

        <ProductGallery
          images={product.images}
          productName={product.name}
          activeImage={activeImage ?? product.images[0]}
          onSelect={setActiveImage}
        />

        <article className="section-panel detail-panel">
          {collection ? (
            <Link className="eyebrow detail-category-link" to={`/collections/${collection.slug}`}>
              <span aria-hidden="true">← </span>
              {collection.name}
              {product.designType ? ` · ${product.designType}` : ""}
            </Link>
          ) : (
            <Link className="eyebrow detail-category-link" to={`/products?category=${encodeURIComponent(product.category)}`}>
              {product.category}
            </Link>
          )}
          <h1 className="detail-title">{product.name}</h1>

          <div className="detail-panel-price">
            <DetailPrice
              unitPrice={unitPrice}
              isBulkPrice={isBulkPrice}
              hasDiscount={hasDiscount}
              mrp={product.mrp}
              discountPercent={discountPercent}
            />
          </div>

          {/* Availability + lead time, stated together rather than hidden in a pill. */}
          <p className={`detail-availability ${outOfStock ? "is-out" : lowStock ? "is-low" : "is-in"}`}>
            <Clock size={15} strokeWidth={1.8} aria-hidden="true" />
            {outOfStock ? "Out of stock" : lowStock ? `Only ${product.stock} left` : "In stock"}
            {product.leadTime ? ` · ${formatLeadTime(product.leadTime)}` : ""}
            {product.minimumOrderQty ? ` · MOQ ${product.minimumOrderQty}` : ""}
          </p>

          {showStepper ? (
            <BulkPricingTable
              product={product}
              quantity={quantity}
              onSelectQuantity={selectBulkQuantity}
              maxQuantity={maxQty}
            />
          ) : null}

          {/* Quantity + the two purchase actions form one group. The stepper
              feeds both buttons, so it sits directly above them; they get their
              own equal-width row so neither reads as secondary to the other and
              they stack cleanly on a phone. */}
          <div className="detail-buy" ref={buyButtonsRef}>
            {showStepper ? (
              <div className="detail-qty-row">
                <span className="detail-qty-label">Quantity</span>
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  min={minQty}
                  max={maxQty}
                  step={qtyStep}
                  ariaLabel={`Quantity of ${product.name}`}
                />
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AddToCartButton
                product={product}
                quantity={quantity}
                variant="secondary"
                size="lg"
                className="w-full"
              />
              <BuyNowButton product={product} quantity={quantity} size="lg" className="w-full" />
            </div>
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

          {/* The reading comes after the purchase, so the buy buttons sit on
              the first screen beside the photo. */}
          <p className="section-copy detail-description">{product.description}</p>

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
          <ProductRail
            title={collection ? `More designs in ${collection.name}` : `More in ${product.category}`}
            products={related}
            className=""
          />
        </section>
      ) : null}

      {!outOfStock ? (
        <>
          <MobileBuyBar product={product} quantity={quantity} unitPrice={unitPrice} isVisible={buyButtonsOffScreen} />
          {/* Room for the bar, so it never covers the end of the page on phones. */}
          <div className="mobile-buy-bar-spacer" aria-hidden="true" />
        </>
      ) : null}
    </main>
  );
}

export default ProductDetailPage;
