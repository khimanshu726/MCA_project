import { Link } from "react-router-dom";
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

function HomePage() {
  return (
    <main className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Built for business print</p>
          <h2>Print products that feel launch-ready, brand-ready, and easier to order.</h2>
          <p className="section-copy">
            Shop cards, flyers, packaging, merchandise, invitations, and gifting products with faster browsing, clearer customization paths, and an order flow made for repeat business.
          </p>
          <div className="hero-feature-row">
            <span className="meta-pill">Browse templates</span>
            <span className="meta-pill">Upload your design</span>
            <span className="meta-pill">Plan bulk orders</span>
          </div>
          <div className="action-row">
            <Link className="primary-button" to="/products">
              Shop all products
            </Link>
            <Link className="secondary-button" to="/customize">
              Start customizing
            </Link>
            <Link className="secondary-button" to="/cart">
              View cart
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
        {trustHighlights.map((item) => (
          <article key={item.title} className="trust-card">
            <p className="eyebrow">Store benefit</p>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Shop by category</p>
          <h2>Explore the print products customers usually discover first.</h2>
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

      <section className="section-panel">
        <div className="section-heading section-heading-row">
          <div>
            <p className="eyebrow">Most popular products</p>
            <h2>Best-selling print essentials with clearer buying paths.</h2>
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
          <p className="eyebrow">Ideas and services</p>
          <h2>Give customers more than products: give them a starting point.</h2>
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
