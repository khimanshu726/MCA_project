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
    quote: "The finishing was flawless. Our cards arrived faster than expected and clients keep asking where we got them.",
    name: "Ananya Sharma",
    title: "Founder, Studio Marlow",
    initials: "AS",
  },
  {
    quote: "Elite Empressions is our go-to for launch collateral. Consistent color, premium paper stocks, zero surprises.",
    name: "Rohan Patel",
    title: "Head of Brand, Firelane",
    initials: "RP",
  },
  {
    quote: "The customization flow is genuinely fun. We put together a full merch drop in under an hour.",
    name: "Priya Menon",
    title: "Creative Director, Lumo",
    initials: "PM",
  },
];

function HomePage() {
  return (
    <main className="page-stack">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Print, elevated</p>
          <h2>Premium print, delivered launch-ready.</h2>
          <p className="section-copy">
            Business cards, marketing collateral, packaging and merchandise—crafted on premium stocks with modern finishes,
            fast turnaround, and a customization flow made for growing brands.
          </p>
          <div className="hero-feature-row">
            <span className="meta-pill">Free design review</span>
            <span className="meta-pill">72-hr rush available</span>
            <span className="meta-pill">Bulk pricing</span>
          </div>
          <div className="action-row">
            <Link className="primary-button" to="/products">Shop all products</Link>
            <Link className="secondary-button" to="/customize">Start customizing</Link>
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

      {/* Trust strip */}
      <section className="trust-strip" aria-label="Store highlights">
        {trustHighlights.map((item, index) => {
          const Icon = trustIcons[index % trustIcons.length];
          return (
            <article key={item.title} className="trust-card">
              <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--ink-100)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ink-900)", marginBottom: "0.75rem" }} aria-hidden="true">
                <Icon size={18} strokeWidth={1.7} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          );
        })}
      </section>

      {/* Categories */}
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Shop by category</p>
          <h2>Explore the print products customers discover first.</h2>
          <p className="section-copy">
            Start with core business stationery, campaign materials, custom gifting, or event print and move straight into details.
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

      {/* Popular products */}
      <section className="section-panel">
        <div className="section-heading section-heading-row">
          <div>
            <p className="eyebrow">Most popular</p>
            <h2>Best-selling print essentials.</h2>
          </div>
          <Link className="secondary-button" to="/products">Explore full catalog</Link>
        </div>
        <div className="product-grid">
          {popularProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Brand story */}
      <section className="brand-story">
        <div>
          <p className="eyebrow">Why Elite Empressions</p>
          <h2>Crafted for brands that care about detail.</h2>
          <p style={{ marginTop: "1rem", marginBottom: "1.75rem" }}>
            We combine studio-grade printing with a modern ordering experience—so every card, box, and banner arrives
            print-perfect. Trusted by studios, agencies, and independent brands across India.
          </p>
          <Link className="primary-button" to="/products">Browse the catalog</Link>
        </div>
        <div className="brand-stats">
          <div className="brand-stat">
            <strong>12k+</strong>
            <span>Orders shipped</span>
          </div>
          <div className="brand-stat">
            <strong>4.9<span style={{ fontSize: "0.5em", color: "var(--gold)" }}> ★</span></strong>
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

      {/* Essentials */}
      <section className="essentials-grid">
        {businessEssentials.map((item) => (
          <article key={item.id} className="section-panel essentials-card">
            <p className="eyebrow">Business essentials</p>
            <h2>{item.title}</h2>
            <p className="section-copy">{item.description}</p>
            <div className="action-row">
              <Link className="primary-button" to={item.ctaTo}>{item.ctaLabel}</Link>
            </div>
          </article>
        ))}
      </section>

      {/* Testimonials */}
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Loved by teams</p>
          <h2>Trusted by studios and growing brands.</h2>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((t) => (
            <article key={t.name} className="testimonial-card">
              <div className="testimonial-rating" aria-label="5 star rating">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} fill="currentColor" strokeWidth={0} />)}
              </div>
              <p className="testimonial-quote">{t.quote}</p>
              <div className="testimonial-author">
                <span className="testimonial-avatar" aria-hidden="true">{t.initials}</span>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.title}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Ideas and services</p>
          <h2>More than products—a starting point.</h2>
        </div>
        <div className="service-grid">
          {inspirationLinks.map((item) => (
            <article key={item.id} className="service-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link className="mini-link" to={item.to}>Open</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default HomePage;
