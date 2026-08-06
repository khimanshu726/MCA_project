import { memo } from "react";

/**
 * Hero backdrop.
 *
 * The original comp used the `shaders` package (Swirl + ChromaFlow +
 * FlutedGlass + FilmGrain stacked over each other). That is a WebGL
 * dependency and a build-size cost for what is, on this page, decoration
 * behind text — so the same four layers are recreated in CSS/SVG here:
 * a drifting swirl, two brand-tinted chroma blooms, angled fluted-glass
 * striping, and a fractal-noise grain plate. Keyframes live in
 * styles/axion-home.css.
 *
 * Purely decorative: aria-hidden and pointer-events-none, so it never
 * intercepts a click meant for the CTA underneath.
 */
function HeroBackdrop() {
  return (
    <div className="axion-shader" aria-hidden="true">
      <div className="axion-shader__swirl" />
      <div className="axion-shader__chroma-a" />
      <div className="axion-shader__chroma-b" />
      <div className="axion-shader__fluted" />
      <div className="axion-shader__grain" />
    </div>
  );
}

export default memo(HeroBackdrop);
