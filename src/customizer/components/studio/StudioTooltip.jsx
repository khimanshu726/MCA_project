/**
 * Tooltip for icon-only controls.
 *
 * CSS-only (group-hover + focus-visible) so there's no portal or
 * positioning library for what is, in the end, a label — and no JS on the
 * hover path.
 *
 * Styling follows the studio's own system rather than the default
 * black-box tooltip: ink-800 (not pure black), the shared overlay
 * elevation, the same radius as other floating surfaces, and a short
 * fade+slide that respects prefers-reduced-motion.
 *
 * `pointer-events-none` matters: the tip must never intercept the click
 * meant for the button it describes.
 */

const PLACEMENT = {
  right: {
    position: "left-full top-1/2 ml-2 -translate-y-1/2",
    enter: "motion-safe:-translate-x-1 motion-safe:group-hover:translate-x-0 motion-safe:group-focus-visible:translate-x-0",
  },
  top: {
    position: "bottom-full left-1/2 mb-2 -translate-x-1/2",
    enter: "motion-safe:translate-y-1 motion-safe:group-hover:translate-y-0 motion-safe:group-focus-visible:translate-y-0",
  },
  bottom: {
    position: "top-full left-1/2 mt-2 -translate-x-1/2",
    enter: "motion-safe:-translate-y-1 motion-safe:group-hover:translate-y-0 motion-safe:group-focus-visible:translate-y-0",
  },
};

function StudioTooltip({ label, side = "right", shortcut }) {
  const { position, enter } = PLACEMENT[side] || PLACEMENT.right;

  return (
    // delay-0 on the base, delay-500 on hover: the tip waits for deliberate
    // intent before covering canvas, but vanishes instantly on leave. Without
    // it, sweeping the rail strobes labels across the artwork.
    <span
      role="tooltip"
      className={`pointer-events-none absolute z-50 flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-ink-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-overlay transition-[opacity,transform] delay-0 duration-150 ease-out group-hover:opacity-100 group-hover:delay-500 group-focus-visible:opacity-100 group-focus-visible:delay-0 ${position} ${enter}`}
    >
      {label}
      {shortcut ? <kbd className="font-sans text-xs text-ink-400">{shortcut}</kbd> : null}
    </span>
  );
}

export default StudioTooltip;
