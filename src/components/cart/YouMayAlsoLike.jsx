import { useMemo } from "react";
import ProductCard from "../ProductCard";
import { useProducts } from "../../hooks/useProducts";

// Cheap, category-based recommendation — no backend needed. Fed the most
// common category among the current cart items.
const findDominantCategory = (items) => {
  const counts = new Map();

  items.forEach((item) => {
    const category = item.product?.category;
    if (!category) return;
    counts.set(category, (counts.get(category) || 0) + 1);
  });

  let dominant = null;
  let max = 0;

  counts.forEach((count, category) => {
    if (count > max) {
      max = count;
      dominant = category;
    }
  });

  return dominant;
};

function YouMayAlsoLike({ items, excludeIds = [] }) {
  const category = useMemo(() => findDominantCategory(items), [items]);
  const { data } = useProducts({ category: category || undefined, limit: 8 });
  const products = (data?.items ?? []).filter((product) => !excludeIds.includes(product.id)).slice(0, 4);

  if (!category || products.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-ink-900">You may also like</h2>
      <div className="product-grid mt-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default YouMayAlsoLike;
