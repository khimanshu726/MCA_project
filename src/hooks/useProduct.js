import { useQuery } from "@tanstack/react-query";
import { getProduct } from "../api/productsApi";

export function useProduct(productId) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId),
    enabled: Boolean(productId),
    select: (data) => data.product,
    retry: false,
  });
}
