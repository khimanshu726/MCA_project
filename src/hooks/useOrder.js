import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "../context/UserAuthContext";
import { cancelCustomerOrder, getCustomerOrder, returnCustomerOrder } from "../api/ordersApi";

// Single-order detail + the customer self-service actions (cancel/return).
// Works for both authenticated and guest orders — token is optional, the
// server enforces ownership either way (see orderController.getCustomerOrder).
export function useOrder(orderId) {
  const { token } = useUserAuth();
  const queryClient = useQueryClient();
  const queryKey = ["order", orderId];

  const orderQuery = useQuery({
    queryKey,
    queryFn: () => getCustomerOrder(orderId, token),
    enabled: Boolean(orderId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const cancelMutation = useMutation({
    mutationFn: () => cancelCustomerOrder(orderId, token),
    onSuccess: invalidate,
  });

  const returnMutation = useMutation({
    mutationFn: () => returnCustomerOrder(orderId, token),
    onSuccess: invalidate,
  });

  return {
    order: orderQuery.data?.order ?? null,
    isLoading: orderQuery.isLoading,
    isError: orderQuery.isError,
    cancelOrder: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    returnOrder: returnMutation.mutateAsync,
    isReturning: returnMutation.isPending,
  };
}
