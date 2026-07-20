import { useQuery } from "@tanstack/react-query";
import { getFrequentlyBoughtTogether } from "../api/productsApi";

export function useFrequentlyBoughtTogether(productId, limit = 4) {
  return useQuery({
    queryKey: ["frequently-bought-together", productId, limit],
    queryFn: () => getFrequentlyBoughtTogether(productId, limit),
    enabled: Boolean(productId),
    select: (data) => data.items,
  });
}
