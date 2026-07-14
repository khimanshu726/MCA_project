import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../api/productsApi";

export function useProducts(filters = {}) {
  const { category, q, sort, page, limit, featured, ids } = filters;

  return useQuery({
    queryKey: ["products", { category, q, sort, page, limit, featured, ids }],
    queryFn: () => listProducts(filters),
    enabled: !Array.isArray(ids) || ids.length > 0,
    placeholderData: (previousData) => previousData,
  });
}
