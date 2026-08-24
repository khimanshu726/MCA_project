/**
 * A simple shimmer placeholder for a list of rows/cards, so loading states in the
 * account area match the skeletons already used on the cart and product pages
 * (rather than a bare "Loading…" line). Decorative — hidden from assistive tech —
 * and it stops animating under prefers-reduced-motion.
 */
function ListSkeleton({ count = 3, rowClassName = "h-20" }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`rounded-2xl bg-ink-100 animate-pulse motion-reduce:animate-none ${rowClassName}`.trim()}
        />
      ))}
    </div>
  );
}

export default ListSkeleton;
