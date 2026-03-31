import { Link } from "react-router-dom";
import ImageCard from "../components/ImageCard";
import ResponsiveImage from "../components/ResponsiveImage";
import { categories, homepageBanner } from "../data";

function HomePage() {
  return (
    <main className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Homepage banner</p>
          <h2>High-impact print products with a clean, scalable image system.</h2>
          <p className="section-copy">
            Browse product visuals, inspect multi-image details, and upload your own design for a live preview before ordering.
          </p>
          <div className="action-row">
            <Link className="primary-button" to="/products">
              View Products
            </Link>
            <Link className="secondary-button" to="/customize">
              Start Customizing
            </Link>
            <Link className="secondary-button" to="/cart">
              Open Cart
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

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Category images</p>
          <h2>Static UI images for homepage browsing.</h2>
        </div>

        <div className="category-grid">
          {categories.map((category) => (
            <ImageCard
              key={category.id}
              imageSrc={category.image}
              imageAlt={category.title}
              title={category.title}
              description={category.description}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default HomePage;
