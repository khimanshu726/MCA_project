import ProductRailCard from "./ProductRailCard";

/**
 * A compact, horizontally scrollable recommendation strip. Keeps each cart
 * recommendation section to roughly one row so it never buries the checkout
 * button. Renders nothing when there are no products.
 */
function ProductRail({ title, products = [] }) {
  if (!products.length) return null;

  return (
    <section className="mt-6">
      <h2 className="font-display text-lg text-ink-900">{title}</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product) => (
          <ProductRailCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default ProductRail;
