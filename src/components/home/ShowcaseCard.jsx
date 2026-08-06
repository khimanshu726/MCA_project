import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ResponsiveImage from "../ResponsiveImage";

/**
 * Work-showcase card. The comp used an autoplaying video with a pill that
 * grows out of a circle on hover; there is no video in this catalog, so the
 * media slot is a ResponsiveImage (same skeleton + fallback behaviour as
 * every other image in the app) and the pill interaction is unchanged.
 *
 * The pill animates width rather than opacity alone so the label is clipped
 * out of the circle instead of overflowing it mid-transition.
 */
function ShowcaseCard({
  to,
  image,
  imageAlt,
  aspectClassName,
  label,
  labelWidth,
  tone = "light",
  description,
  title,
}) {
  const dark = tone === "dark";

  return (
    <article>
      <Link
        to={to}
        className="group relative block overflow-hidden rounded-2xl bg-ink-100"
      >
        <ResponsiveImage
          src={image}
          alt={imageAlt}
          aspectClassName={aspectClassName}
          className="h-full w-full object-cover"
        />
        <span
          className={`absolute bottom-4 left-4 flex h-9 w-9 items-center justify-start gap-2 overflow-hidden rounded-full px-[11px] transition-all duration-300 ease-in-out ${
            dark ? "bg-ink-900" : "bg-white"
          }`}
          style={{ "--pill-w": labelWidth }}
          data-pill
        >
          <ArrowRight
            size={14}
            className={`shrink-0 -rotate-45 transition-transform duration-300 ease-in-out group-hover:rotate-0 ${
              dark ? "text-white" : "text-ink-900"
            }`}
          />
          <span
            className={`whitespace-nowrap text-[13px] font-medium opacity-0 transition-opacity delay-100 duration-300 ease-in-out group-hover:opacity-100 ${
              dark ? "text-white" : "text-ink-900"
            }`}
          >
            {label}
          </span>
        </span>
      </Link>
      <p className="mt-4 max-w-[46ch] text-[13px] leading-relaxed text-ink-600 sm:text-sm">
        {description}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink-900 sm:text-[15px]">{title}</p>
    </article>
  );
}

export default ShowcaseCard;
