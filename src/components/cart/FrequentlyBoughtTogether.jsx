import ProductRail from "./ProductRail";
import { useFrequentlyBoughtTogether } from "../../hooks/useFrequentlyBoughtTogether";

// Seeded from the first item in the cart — real order co-occurrence with a
// same-category fallback (server/services/recommendationService.js). Rendered as
// a compact horizontal rail so it never buries the checkout button.
function FrequentlyBoughtTogether({ seedProductId, excludeIds = [] }) {
  const { data: products } = useFrequentlyBoughtTogether(seedProductId, 8);
  const items = (products ?? []).filter((product) => !excludeIds.includes(product.id));

  if (!seedProductId) return null;

  return <ProductRail title="Frequently bought together" products={items} />;
}

export default FrequentlyBoughtTogether;
