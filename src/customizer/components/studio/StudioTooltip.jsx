/**
 * Tooltip for icon-only controls. CSS-only (group-hover + focus-within) so
 * there's no portal or positioning library for what is, in the end, a
 * label — and no JS on the hover path.
 *
 * `pointer-events-none` matters: the tip must never intercept the click
 * meant for the button it describes.
 */
function StudioTooltip({ label, side = "right", shortcut }) {
  const position =
    side === "right"
      ? "left-full top-1/2 ml-2 -translate-y-1/2"
      : "bottom-full left-1/2 mb-2 -translate-x-1/2";

  return (
    <span
      role="tooltip"
      className={`pointer-events-none absolute z-50 flex items-center gap-2 whitespace-nowrap rounded-lg bg-ink-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-overlay transition-[opacity,transform] duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:translate-x-0 motion-safe:scale-95 motion-safe:group-hover:scale-100 motion-safe:group-focus-visible:scale-100 ${position}`}
    >
      {label}
      {shortcut ? <kbd className="font-sans text-[10px] text-ink-400">{shortcut}</kbd> : null}
    </span>
  );
}

export default StudioTooltip;
