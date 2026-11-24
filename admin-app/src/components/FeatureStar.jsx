// One-click Featured toggle for a product row. Featured products are shown
// first in the shop. The row itself opens the editor on click/Enter, so the
// star keeps its own clicks and key presses from reaching the row.
function FeatureStar({ product, onToggle }) {
  const featured = Boolean(product.featured);
  return (
    <button
      type="button"
      className={`feature-star${featured ? " is-featured" : ""}`}
      aria-pressed={featured}
      aria-label={`Featured: show ${product.name} first in the shop`}
      title={featured ? "Featured: shown first in the shop" : "Show first in the shop"}
      onClick={(event) => {
        event.stopPropagation();
        onToggle(product);
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {featured ? "★" : "☆"}
    </button>
  );
}

export default FeatureStar;
