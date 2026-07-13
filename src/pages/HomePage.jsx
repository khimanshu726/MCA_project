import { Link } from "react-router-dom";
import { Star, Sparkles, Truck, ShieldCheck, Palette } from "lucide-react";
import ImageCard from "../components/ImageCard";
import ProductCard from "../components/ProductCard";
import ResponsiveImage from "../components/ResponsiveImage";
import {
  businessEssentials,
  categories,
  homepageBanner,
  inspirationLinks,
  popularProducts,
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
              to={`/products/${category.productId}`}
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
        <div className="product-grid">
          {popularProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
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
