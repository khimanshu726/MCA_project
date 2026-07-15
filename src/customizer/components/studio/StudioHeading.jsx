/**
 * A heading that Tailwind can actually style.
 *
 * styles.css is imported unlayered (main.jsx) while Tailwind's utilities
 * live in `@layer utilities`, and per the cascade spec unlayered
 * declarations outrank layered ones. So `h1,h2,h3,h4 { font-family:
 * var(--font-display) }` and `h2 { font-size: clamp(1.75rem,3vw,2.5rem) }`
 * (styles.css:119-129) beat any `text-sm`/`font-sans` utility — a panel
 * label written as <h2 className="text-sm"> rendered at 38px in Fraunces.
 *
 * That's correct for the storefront's editorial headings and wrong for
 * editor chrome. Rather than re-layer styles.css (which would re-cascade
 * every storefront page), the studio uses a div with heading semantics:
 * same a11y tree, no legacy tag styling, fully utility-driven.
 */
function StudioHeading({ level = 2, className = "", children }) {
  return (
    <div role="heading" aria-level={level} className={className}>
      {children}
    </div>
  );
}

export default StudioHeading;
