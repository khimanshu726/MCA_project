import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Pill CTA with the vertical text-roll hover from the comp: the label is
 * rendered twice inside a clipped 20px window and the stack slides up by
 * half on hover, so the outgoing and incoming copies are always the same
 * glyphs — no cross-fade, no layout shift. The arrow chip rotates -45deg
 * on the same easing.
 *
 * Renders a <Link> when `to` is set and a <button> otherwise, so it can be
 * used for navigation and for actions without a second component.
 */
function RollButton({
  to,
  onClick,
  children,
  tone = "brand",
  className = "",
  arrowLabel,
}) {
  const surface =
    tone === "brand"
      ? "bg-brand-500 hover:bg-brand-600 text-white"
      : "bg-ink-900 hover:bg-ink-800 text-white";

  const chipInk = tone === "brand" ? "text-brand-500" : "text-ink-900";

  const content = (
    <>
      <span className="block h-[20px] overflow-hidden">
        <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
          <span className="h-[20px] leading-[20px]">{children}</span>
          <span className="h-[20px] leading-[20px]" aria-hidden="true">
            {children}
          </span>
        </span>
      </span>
      <span
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45 sm:h-8 sm:w-8 ${chipInk}`}
      >
        <ArrowRight size={15} strokeWidth={2.2} aria-label={arrowLabel} />
      </span>
    </>
  );

  const shell = `group inline-flex items-center gap-3.5 rounded-full py-2 pl-5 pr-2 text-[13px] font-medium transition-colors sm:pl-6 sm:text-sm ${surface} ${className}`;

  if (to) {
    return (
      <Link to={to} className={shell}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={shell}>
      {content}
    </button>
  );
}

export default RollButton;
