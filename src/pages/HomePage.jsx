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
      <section className="hero-section premium-hero">
        <div className="hero-content">
          <div className="hero-badge">✨ Premium Print Shop</div>
          <h1>Transform Your Vision into Premium Print</h1>
          <p className="hero-description">
            From business cards to custom merchandise, create impactful print solutions with studio-grade quality,
            fast turnaround, and a seamless customization experience designed for ambitious brands.
          </p>

          <div className="premium-features">
            <div className="premium-feature">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span>Studio Quality</span>
            </div>
            <div className="premium-feature">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 10c0 6-4 10-10 10S0 16 0 10 4 0 10 0s10 4 10 10z"/>
                  <path d="M9 10l2 2 4-4"/>
                </svg>
              </div>
              <span>Perfect Finish</span>
            </div>
            <div className="premium-feature">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span>Fast Turnaround</span>
            </div>
          </div>

          <div className="hero-actions">
            <Link className="primary-button premium" to="/products">Shop Collection</Link>
            <Link className="secondary-button premium" to="/customize">Customize Now</Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-container">
            <ResponsiveImage
              src={homepageBanner.src}
              alt={homepageBanner.alt}
              className="hero-image premium"
              aspectClassName="ratio-hero"
              priority
            />
            <div className="hero-decoration">
              <div className="decoration-line"></div>
              <div className="decoration-dot"></div>
              <div className="decoration-circle"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="trust-strip premium-trust" aria-label="Store highlights">
        <div className="trust-grid">
          {trustHighlights.map((item, index) => {
            const Icon = trustIcons[index % trustIcons.length];
            return (
              <article key={item.title} className="trust-card premium">
                <div className="trust-icon-wrapper">
                  <span className="trust-icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={1.8} />
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="section-panel premium-section">
        <div className="section-heading">
          <p className="eyebrow">Shop Categories</p>
          <h2>Explore Our Premium Collection</h2>
          <p className="section-copy">
            Discover premium print products organized by category, each designed to elevate your brand presence.
          </p>
        </div>
        <div className="category-grid premium-grid">
          {categories.map((category) => (
            <ImageCard
              key={category.id}
              imageSrc={category.image}
              imageAlt={category.title}
              title={category.title}
              description={category.description}
              to={`/products/${category.productId}`}
              className="premium-card"
            />
          ))}
        </div>
      </section>

      {/* Popular products */}
      <section className="section-panel premium-section">
        <div className="section-heading premium-heading">
          <div>
            <p className="eyebrow">Most Popular</p>
            <h2>Customer Favorites</h2>
          </div>
          <Link className="secondary-button premium" to="/products">View All</Link>
        </div>
        <div className="product-grid premium-grid">
          {popularProducts.map((product) => (
            <ProductCard key={product.id} product={product} className="premium-card" />
          ))}
        </div>
      </section>

      {/* Brand story */}
      <section className="brand-story premium-brand">
        <div className="brand-content">
          <p className="eyebrow">Why Elite Empressions</p>
          <h2>Crafted for Brands That Care About Detail</h2>
          <p className="brand-description">
            We combine studio-grade printing with a modern ordering experience—so every card, box, and banner arrives
            print-perfect. Trusted by studios, agencies, and independent brands across India.
          </p>
          <Link className="primary-button premium" to="/products">Browse the Catalog</Link>
        </div>
        <div className="brand-stats premium-stats">
          <div className="brand-stat premium">
            <div className="stat-value">12k+</div>
            <div className="stat-label">Orders Shipped</div>
          </div>
          <div className="brand-stat premium">
            <div className="stat-value">
              4.9 <span className="star">★</span>
            </div>
            <div className="stat-label">Customer Rating</div>
          </div>
          <div className="brand-stat premium">
            <div className="stat-value">72h</div>
            <div className="stat-label">Rush Turnaround</div>
          </div>
          <div className="brand-stat premium">
            <div className="stat-value">100%</div>
            <div className="stat-label">Reprint Guarantee</div>
          </div>
        </div>
      </section>

      {/* Essentials */}
      <section className="essentials-grid premium-essentials" aria-label="Business essentials">
        {businessEssentials.map((item) => (
          <article key={item.id} className="section-panel essentials-card premium-card">
            <div className="essentials-badge">Business Essentials</div>
            <h2>{item.title}</h2>
            <p className="section-copy">{item.description}</p>
            <div className="action-row">
              <Link className="primary-button premium" to={item.ctaTo}>{item.ctaLabel}</Link>
            </div>
          </article>
        ))}
      </section>

      {/* Testimonials */}
      <section className="section-panel premium-section premium-testimonials" aria-label="Customer testimonials">
        <div className="section-heading">
          <p className="eyebrow">What They Say</p>
          <h2>Trusted by Studios and Growing Brands</h2>
        </div>
        <div className="testimonials-grid premium-grid">
          {testimonials.map((t) => (
            <article key={t.name} className="testimonial-card premium">
              <div className="testimonial-rating" aria-label="5 star rating">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} fill="currentColor" strokeWidth={0} />)}
              </div>
              <p className="testimonial-quote">“{t.quote}”</p>
              <div className="testimonial-author premium">
                <div className="testimonial-avatar premium">{t.initials}</div>
                <div>
                  <strong>{t.name}</strong>
                  <span className="testimonial-title">{t.title}</span>
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
