import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../api/productsApi";

export function useProducts(filters = {}) {
  const {
    category,
    q,
    sort,
    page,
    limit,
    featured,
    ids,
    collection,
    excludeCollected,
    withCollectionDesigns,
    categories,
    enabled = true,
  } = filters;

  return useQuery({
    queryKey: [
      "products",
      { category, q, sort, page, limit, featured, ids, collection, excludeCollected, withCollectionDesigns, categories },
    ],
    queryFn: () => listProducts(filters),
    enabled: enabled && (!Array.isArray(ids) || ids.length > 0),
    placeholderData: (previousData) => previousData,
  });
}
