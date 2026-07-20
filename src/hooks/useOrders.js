import { useQuery } from "@tanstack/react-query";
import { useUserAuth } from "../context/UserAuthContext";
import { getCustomerOrders } from "../api/ordersApi";

// Authenticated-only order history list — same shape of hook as
// useWishlist.js/useAddresses.js.
export function useOrders() {
  const { token, isAuthenticated } = useUserAuth();

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => getCustomerOrders(token),
    enabled: Boolean(isAuthenticated && token),
    staleTime: 15_000,
  });

  return {
    orders: ordersQuery.data?.orders ?? [],
    isLoading: isAuthenticated ? ordersQuery.isLoading : false,
    isError: ordersQuery.isError,
  };
}
