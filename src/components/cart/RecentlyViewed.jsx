import ProductCard from "../ProductCard";
import { useProducts } from "../../hooks/useProducts";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";

function RecentlyViewed({ excludeIds = [] }) {
  const { ids } = useRecentlyViewed();
  const visibleIds = ids.filter((id) => !excludeIds.includes(id));
  const { data } = useProducts({ ids: visibleIds });
  const items = data?.items ?? [];

  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-ink-900">Recently viewed</h2>
      <div className="product-grid mt-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default RecentlyViewed;
