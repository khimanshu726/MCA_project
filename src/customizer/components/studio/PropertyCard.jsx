import StudioHeading from "./StudioHeading.jsx";

/**
 * The inspector's grouping primitive, and the owner of its type scale.
 *
 * Deliberately not ui/Card — that's a storefront surface (rounded-2xl,
 * bordered, shadowed, p-5). A property group is an inset panel: tinted
 * background, no border, tighter rhythm. Separating groups by value rather
 * than stroke is what keeps the inspector from reading as a stack of
 * outlined ecommerce boxes.
 *
 * Type scale (the whole inspector defers to this):
 *   eyebrow  text-xs / semibold / uppercase / tracking-wide / ink-400
 *   value    text-sm / medium   / ink-900
 *   helper   text-xs / normal   / ink-400
 */
function PropertyCard({ title, actions = null, children, inset = true }) {
  return (
    <section className={inset ? "rounded-xl bg-ink-50 p-3" : ""}>
      {title ? (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <StudioHeading level={3} className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {title}
          </StudioHeading>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export default PropertyCard;
