import ProductCard from "../ProductCard";
import { useFrequentlyBoughtTogether } from "../../hooks/useFrequentlyBoughtTogether";

// Seeded from the first item in the cart — real order co-occurrence with a
// same-category fallback (server/services/recommendationService.js).
function FrequentlyBoughtTogether({ seedProductId, excludeIds = [] }) {
  const { data: products } = useFrequentlyBoughtTogether(seedProductId);
  const items = (products ?? []).filter((product) => !excludeIds.includes(product.id));

  if (!seedProductId || items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-ink-900">Frequently bought together</h2>
      <div className="product-grid mt-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default FrequentlyBoughtTogether;
