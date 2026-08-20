import { Link } from "react-router-dom";
import { heroMedia as defaultHeroMedia } from "../data";

/**
 * Full-bleed cinematic hero. Ships with an on-brand animated gradient backdrop
 * (pure CSS, no external media) and a drop-in <video> slot: when `media.videoSrc`
 * is set it mounts a muted/looping clip above the backdrop, otherwise the
 * animated gradient carries the section. A soft scrim keeps the copy legible over
 * whichever backdrop is active. Motion is suppressed on mobile and for
 * `prefers-reduced-motion` in CSS.
 *
 * `media` is a prop (defaulting to the `heroMedia` config in data.js) so the
 * video path is testable without touching global config.
 */
function HeroCinematic({ media = defaultHeroMedia }) {
  const videoSrc = media?.videoSrc || "";
  const poster = media?.poster || "";

  return (
    <section className="hero-cinematic" aria-label="Premium print shop">
      <div className="hero-cinematic-bg" aria-hidden="true">
        <span className="hero-mesh hero-mesh-1" />
        <span className="hero-mesh hero-mesh-2" />
        <span className="hero-mesh hero-mesh-3" />
        {videoSrc ? (
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={poster || undefined}
            data-testid="hero-video"
          >
            <source src={videoSrc} />
          </video>
        ) : null}
        <div className="hero-scrim" />
      </div>

      <div className="hero-cinematic-inner">
        <div className="hero-cinematic-copy">
          <p className="eyebrow">Premium Print Shop</p>
          <h2 className="hero-cinematic-title">Print products that feel launch-ready from the first click.</h2>
          <p className="section-copy hero-cinematic-sub">
            Business cards, brochures, packaging, invitations, and custom gifts — designed to feel
            premium, easy to customize, and fast to reorder.
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
      </div>
    </section>
  );
}

export default HeroCinematic;
