import { Link } from "react-router-dom";
import ResponsiveImage from "./ResponsiveImage";
import { homeFeatures } from "../data";

/**
 * Per-row media: a looping <video> when the row has a `videoSrc` (drop-in slot,
 * same mechanism as the hero), otherwise the still image via ResponsiveImage.
 */
function FeatureMedia({ feature }) {
  if (feature.videoSrc) {
    return (
      <video
        className="feature-media-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={feature.poster || undefined}
        data-testid={`feature-video-${feature.id}`}
      >
        <source src={feature.videoSrc} />
      </video>
    );
  }
  return (
    <ResponsiveImage
      src={feature.image}
      alt={feature.imageAlt}
      aspectClassName="ratio-feature"
      className="feature-media-img"
    />
  );
}

/**
 * Alternating "chess" feature layout: rows flip media-left/text-right, then swap
 * (handled in CSS via :nth-child(even)). Content comes from the `homeFeatures`
 * config; each row carries a drop-in video slot. Presentational only.
 */
function FeatureChessSection({ features = homeFeatures }) {
  return (
    <section className="feature-chess" aria-label="What you can do with Elite Impressions">
      {features.map((feature) => (
        <article key={feature.id} className="feature-row">
          <div className="feature-media">
            <FeatureMedia feature={feature} />
          </div>
          <div className="feature-copy">
            <p className="eyebrow">{feature.eyebrow}</p>
            <h2>{feature.title}</h2>
            <p className="section-copy">{feature.description}</p>
            <div className="action-row">
              <Link className="primary-button" to={feature.cta.to}>
                {feature.cta.label}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export default FeatureChessSection;
