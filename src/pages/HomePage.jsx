import { Link } from "react-router-dom";
import { Star, Sparkles, Truck, ShieldCheck, Palette } from "lucide-react";
import ImageCard from "../components/ImageCard";
import ProductCard from "../components/ProductCard";
import ResponsiveImage from "../components/ResponsiveImage";
import { useProducts } from "../hooks/useProducts";
import {
  businessEssentials,
  categories,
  homepageBanner,
  inspirationLinks,
  trustHighlights,
} from "../data";

const trustIcons = [Sparkles, Truck, ShieldCheck, Palette];

const testimonials = [
  {
    quote:
      "The finishing was flawless. Our cards arrived faster than expected and clients keep asking where we got them.",
    name: "Ananya Sharma",
    title: "Founder, Studio Marlow",
    initials: "AS",
  },
  {
    quote:
      "Elite Empressions is our go-to for launch collateral. Consistent color, premium paper stocks, zero surprises.",
    name: "Rohan Patel",
    title: "Head of Brand, Firelane",
    initials: "RP",
  },
  {
    quote:
      "The customization flow is genuinely fun. We put together a full merch drop in under an hour.",
    name: "Priya Menon",
    title: "Creative Director, Lumo",
    initials: "PM",
  },
];

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
    <main className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Premium Print Shop</p>
          <h2>Print products that feel launch-ready from the first click.</h2>
          <p className="section-copy">
            Business cards, brochures, packaging, invitations, and custom gifts - designed to
            feel premium, easy to customize, and fast to reorder.
          </p>
          <div className="hero-feature-row">
            <span className="meta-pill">Studio quality finishes</span>
            <span className="meta-pill">Bulk pricing for teams</span>
            <span className="meta-pill">Production-ready checkout</span>
          </div>
          <div className="action-row">
            <Link className="primary-button" to="/products">
              Shop all products
            </Link>
            <Link className="secondary-button" to="/customize">
              Start customizing
            </Link>
          </div>
        </div>

        <div className="hero-banner">
          <ResponsiveImage
            src={homepageBanner.src}
            alt={homepageBanner.alt}
            className="hero-image"
            aspectClassName="ratio-banner"
            priority
          />
        </div>
      </section>

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

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Shop by category</p>
          <h2>Browse the print products customers discover first.</h2>
          <p className="section-copy">
            Explore stationery, marketing materials, packaging, merchandise, event print, and
            custom gifting from one organized catalog.
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

      <section className="brand-story">
        <div>
          <p className="eyebrow">Why Elite Empressions</p>
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

      <section className="essentials-grid">
        {businessEssentials.map((item) => (
          <article key={item.id} className="section-panel essentials-card">
            <p className="eyebrow">Business essentials</p>
            <h2>{item.title}</h2>
            <p className="section-copy">{item.description}</p>
            <div className="action-row">
              <Link className="primary-button" to={item.ctaTo}>
                {item.ctaLabel}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Customer feedback</p>
          <h2>Trusted by studios, founders, and growing teams.</h2>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="testimonial-card">
              <div className="testimonial-rating" aria-label="5 star rating">
                {[0, 1, 2, 3, 4].map((index) => (
                  <Star key={index} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="testimonial-quote">{testimonial.quote}</p>
              <div className="testimonial-author">
                <span className="testimonial-avatar" aria-hidden="true">
                  {testimonial.initials}
                </span>
                <div>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.title}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Ideas and services</p>
          <h2>More than products - a practical starting point.</h2>
        </div>
        <div className="service-grid">
          {inspirationLinks.map((item) => (
            <article key={item.id} className="service-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link className="mini-link" to={item.to}>
                Open
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default HomePage;
