/**
 * The inspector's single grouping primitive. Deliberately NOT ui/Card —
 * that one is a storefront surface (rounded-2xl, bordered, shadow, p-5).
 * A property group is an inset panel: no border, no shadow, tighter.
 *
 * It also owns the one eyebrow recipe, which previously existed as three
 * hand-rolled copies at text-[10px]/text-[11px].
 */
function PropertyCard({ title, actions = null, children, inset = true }) {
  return (
    <section className={inset ? "rounded-xl bg-ink-50 p-3" : ""}>
      {title ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</h4>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export default PropertyCard;
