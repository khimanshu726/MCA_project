import { heroMedia as defaultHeroMedia } from "../data";

/**
 * Decorative divider that straddles the seam between the hero and the section
 * below it (the video's "asset divider" idea, on-brand). Purely presentational
 * and aria-hidden. Renders a transparent PNG when `media.dividerSrc` is set
 * (drop-in slot for an AI-generated graphic), otherwise a built-in on-brand SVG
 * emblem drawn from the terracotta/gold tokens.
 */
function HeroDivider({ media = defaultHeroMedia }) {
  const dividerSrc = media?.dividerSrc || "";

  return (
    <div className="hero-divider" aria-hidden="true">
      {dividerSrc ? (
        <img className="hero-divider-img" src={dividerSrc} alt="" />
      ) : (
        <svg
          className="hero-divider-svg"
          viewBox="0 0 200 200"
          role="presentation"
          focusable="false"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hero-divider-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--gold)" />
            </linearGradient>
          </defs>
          {/* Soft medallion: concentric rings + a subtle rosette, evoking a wax
              seal / press mark — a premium-print motif built entirely from tokens. */}
          <circle cx="100" cy="100" r="58" fill="var(--bone)" stroke="url(#hero-divider-ring)" strokeWidth="2" />
          <circle cx="100" cy="100" r="46" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.35" />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x = 100 + Math.cos(angle) * 30;
            const y = 100 + Math.sin(angle) * 30;
            return <circle key={i} cx={x} cy={y} r="3.4" fill="url(#hero-divider-ring)" opacity="0.9" />;
          })}
          <circle cx="100" cy="100" r="12" fill="url(#hero-divider-ring)" />
        </svg>
      )}
    </div>
  );
}

export default HeroDivider;
