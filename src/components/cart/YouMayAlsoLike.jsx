import { useMemo } from "react";
import ProductRail from "./ProductRail";
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
  const { data } = useProducts({ category: category || undefined, limit: 12 });
  const products = (data?.items ?? []).filter((product) => !excludeIds.includes(product.id)).slice(0, 10);

  if (!category) return null;

  return <ProductRail title="You may also like" products={products} />;
}

export default YouMayAlsoLike;
