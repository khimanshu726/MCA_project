import { Link } from "react-router-dom";
import { Star, Sparkles, Truck, ShieldCheck, Palette } from "lucide-react";
import Seo, { SITE_URL, SITE_NAME } from "../components/Seo";
import HeroCinematic from "../components/HeroCinematic";
import HeroDivider from "../components/HeroDivider";
import FeatureChessSection from "../components/FeatureChessSection";
import HomeFaqSection from "../components/home/HomeFaqSection";
import ImageCard from "../components/ImageCard";
import ProductCard from "../components/ProductCard";
import { getConfiguredSocialLinks } from "../config/socialLinks";
import { BUSINESS } from "../config/business";
import { useProducts } from "../hooks/useProducts";

const OG_IMAGE =
  "https://images.pexels.com/photos/36412293/pexels-photo-36412293.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop";

// LocalBusiness structured data (Store is a LocalBusiness subtype). Every value
// is real — the NAP + hours come from the shared BUSINESS config that also feeds
// the footer, so search engines see them agree. `geo` is omitted (no coordinates
// provided); Google geocodes from the postal address.
const buildStoreJsonLd = () => {
  const sameAs = [...getConfiguredSocialLinks().map((profile) => profile.url), BUSINESS.googleMapsUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    alternateName: BUSINESS.legalName,
    description:
      "Printing press in Purnia, Bihar for custom business cards, marketing materials, banners, invitations, packaging, merchandise, photo gifts, stationery, and institutional supplies. Pan-India shipping, local delivery, and store pickup.",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    image: OG_IMAGE,
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    priceRange: "₹₹",
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.locality,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.country,
    },
    areaServed: BUSINESS.areaServed,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: BUSINESS.openingDays,
        opens: BUSINESS.opens,
        closes: BUSINESS.closes,
      },
    ],
    ...(sameAs.length ? { sameAs } : {}),
  };
};
import { categories, trustHighlights } from "../data";

const trustIcons = [Sparkles, Truck, ShieldCheck, Palette];

function HomePage() {
  const { data, isLoading, refetch, isFetching } = useProducts({ featured: true, limit: 4 });
  const popularProducts = data?.items ?? [];

  // Belt and braces alongside the networkMode fix in main.jsx. Branching on
  // isLoading/isError alone assumes those two flags cover every non-success
  // state, and they don't — a paused or otherwise indeterminate query
  // satisfies neither and used to fall through here, rendering an empty grid
  // that reads as "this store has no best-sellers".
  //
  // `data` is the honest signal: absent means we never got an answer, whatever
  // the flags say. An answer that legitimately contains nothing is a different
  // situation and gets different words — telling someone we couldn't reach the
  // server when an admin has simply unfeatured everything would be a lie.
  const hasAnswer = Boolean(data);
  const couldNotLoad = !isLoading && !hasAnswer;
  const answeredButEmpty = !isLoading && hasAnswer && popularProducts.length === 0;

  return (
    <main className="page-stack home-stack">
      <Seo
        title="Printing Press in Purnia, Bihar"
        description="Bihar Press (Elite Impressions) is a printing press in Purnia, Bihar for custom business cards, flyers, banners, invitations, packaging, merchandise, and institutional supplies. Order online with pan-India shipping, local delivery in Purnia, and store pickup."
        path="/"
        jsonLd={buildStoreJsonLd()}
      />
      <HeroCinematic />
      <HeroDivider />

      <section className="trust-strip" aria-label="Store highlights">
        {trustHighlights.map((item, index) => {
          const Icon = trustIcons[index % trustIcons.length];
          return (
            <article key={item.title} className="trust-card">
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--ink-100)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-900)",
                  marginBottom: "0.75rem",
                }}
                aria-hidden="true"
              >
                <Icon size={18} strokeWidth={1.7} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          );
        })}
      </section>

      {/* Category browsing + the "what we print" intro, merged into one section
          (they previously duplicated the same categories). Keeps the visual grid
          and the SEO-targeted "printing press in Purnia" copy. */}
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">What we print &amp; customize</p>
          <h2>A printing press in Purnia for business, events, and institutions.</h2>
          <p className="section-copy">
            Elite Impressions is the online store of <strong>Bihar Press</strong>, a printing press in Purnia,
            Bihar. Order custom and personalized print online with pan-India shipping, local delivery in Purnia,
            and store pickup — from everyday business cards to full wedding invitation suites and institutional
            exam supplies.
          </p>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <ImageCard
              key={category.id}
              imageSrc={category.image}
              imageAlt={category.title}
              title={category.title}
              description={category.description}
              // A card labelled "Visiting Cards" under a "Shop by category"
              // heading has to open the category, not one product from inside
              // it. This used to link to `/products/${category.productId}` —
              // a single hardcoded item's detail page — so choosing a category
              // committed the customer to one product, and adding a second
              // visiting card would have left the homepage still pointing at
              // whichever one was picked years earlier.
              //
              // `searchCategory` exists on this data for exactly this purpose
              // and matches the catalog's own category values.
              to={`/products?category=${encodeURIComponent(category.searchCategory)}`}
            />
          ))}
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading section-heading-row">
          <div>
            <p className="eyebrow">Popular now</p>
            <h2>Best-selling essentials for brands and events.</h2>
          </div>
          <Link className="secondary-button" to="/products">
            Explore full catalog
          </Link>
        </div>
        {isLoading ? (
          <p className="section-copy">Loading popular products&hellip;</p>
        ) : couldNotLoad ? (
          <div role="status">
            <p className="section-copy">
              We couldn&rsquo;t load popular products just now. The rest of the catalog is still available.
            </p>
            <div className="action-row">
              <button type="button" className="secondary-button" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? "Retrying…" : "Try again"}
              </button>
              <Link className="ghost-button" to="/products">
                Browse all products
              </Link>
            </div>
          </div>
        ) : answeredButEmpty ? (
          <div>
            <p className="section-copy">
              No products are featured right now &mdash; the full catalog is still open.
            </p>
            <div className="action-row">
              <Link className="secondary-button" to="/products">
                Browse all products
              </Link>
            </div>
          </div>
        ) : (
          <div className="product-grid">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Everything, done well</p>
          <h2>From first design to the final reprint.</h2>
        </div>
        <FeatureChessSection />
      </section>

      <section className="brand-story">
        <div>
          <p className="eyebrow">Why Elite Impressions</p>
          <h2>Crafted for businesses that care about detail.</h2>
          <p style={{ marginTop: "1rem", marginBottom: "1.75rem" }}>
            We combine premium print execution with a cleaner digital ordering flow, so every
            card, banner, invitation, and gift arrives ready to impress.
          </p>
          <Link className="primary-button" to="/products">
            Browse the catalog
          </Link>
        </div>
        <div className="brand-stats">
          <div className="brand-stat">
            <strong>12k+</strong>
            <span>Orders shipped</span>
          </div>
          <div className="brand-stat">
            <strong>
              4.9<span style={{ fontSize: "0.5em", color: "var(--gold)" }}> *</span>
            </strong>
            <span>Customer rating</span>
          </div>
          <div className="brand-stat">
            <strong>72h</strong>
            <span>Rush turnaround</span>
          </div>
          <div className="brand-stat">
            <strong>100%</strong>
            <span>Reprint guarantee</span>
          </div>
        </div>
      </section>

      {/* Real reviews only. The invented testimonials that used to sit here were
          replaced with a link to genuine Google reviews for Bihar Press — honest
          social proof that also drives the review flywheel. */}
      <section className="section-panel">
        <div className="reviews-panel">
          <div className="reviews-copy">
            <p className="eyebrow">Reviews</p>
            <h2>See what our customers say on Google.</h2>
            <p className="section-copy">
              Bihar Press is a real print shop in Purnia serving customers locally and across India. Read genuine
              reviews on Google — and leave one after your next order.
            </p>
            <div className="action-row">
              <a
                className="primary-button"
                href={BUSINESS.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Star size={16} strokeWidth={1.8} aria-hidden="true" /> Review us on Google
              </a>
              <a
                className="secondary-button"
                href={BUSINESS.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read our Google reviews
              </a>
            </div>
          </div>
        </div>
      </section>

      <HomeFaqSection />
    </main>
  );
}

export default HomePage;
