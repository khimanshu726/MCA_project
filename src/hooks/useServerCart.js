import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "../context/UserAuthContext";
import {
  addCartItem,
  clearCartRemote,
  getCart,
  mergeCartRemote,
  removeCartItem,
  toggleSaveForLater,
  updateCartItem,
} from "../api/cartApi";

const CART_QUERY_KEY = ["cart"];

// Server-state layer for the authenticated cart: React Query owns caching
// and each mutation does an optimistic write + snapshot, rolling back on
// failure and reconciling with the server on settle (which also catches
// server-computed flags — price-changed, out-of-stock — that an optimistic
// write can't predict on its own).
export function useServerCart() {
  const { token, isAuthenticated } = useUserAuth();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => getCart(token),
    enabled: Boolean(isAuthenticated && token),
    staleTime: 15_000,
  });

  const applyOptimisticUpdate = (updater) => {
    const previous = queryClient.getQueryData(CART_QUERY_KEY);
    queryClient.setQueryData(CART_QUERY_KEY, (current) => (current ? updater(current) : current));
    return previous;
  };

  const rollback = (previous) => {
    if (previous !== undefined) {
      queryClient.setQueryData(CART_QUERY_KEY, previous);
    }
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });

  const addItemMutation = useMutation({
    mutationFn: ({ productId, quantity }) => addCartItem(token, { productId, quantity }),
    onMutate: async ({ productId, quantity, product }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = applyOptimisticUpdate((current) => {
        const existingIndex = current.items.findIndex((item) => item.productId === productId);

        if (existingIndex >= 0) {
          const nextItems = [...current.items];
          nextItems[existingIndex] = {
            ...nextItems[existingIndex],
            quantity: nextItems[existingIndex].quantity + quantity,
          };
          return { ...current, items: nextItems };
        }

        return {
          ...current,
          items: [
            ...current.items,
            {
              productId,
              quantity,
              savedForLater: false,
              product: product || null,
              isMissing: false,
              isOutOfStock: false,
              isPriceChanged: false,
              isLowStock: false,
              lineTotal: (product?.price || 0) * quantity,
            },
          ],
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => rollback(context?.previous),
    onSettled: invalidate,
  });

  const setQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }) => updateCartItem(token, productId, { quantity }),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = applyOptimisticUpdate((current) => ({
        ...current,
        items: current.items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => rollback(context?.previous),
    onSettled: invalidate,
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId) => removeCartItem(token, productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = applyOptimisticUpdate((current) => ({
        ...current,
        items: current.items.filter((item) => item.productId !== productId),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => rollback(context?.previous),
    onSettled: invalidate,
  });

  const saveForLaterMutation = useMutation({
    mutationFn: ({ productId, savedForLater }) => toggleSaveForLater(token, productId, savedForLater),
    onMutate: async ({ productId, savedForLater }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = applyOptimisticUpdate((current) => ({
        ...current,
        items: current.items.map((item) => (item.productId === productId ? { ...item, savedForLater } : item)),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => rollback(context?.previous),
    onSettled: invalidate,
  });

  const clearCartMutation = useMutation({
    mutationFn: () => clearCartRemote(token),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = applyOptimisticUpdate((current) => ({ ...current, items: [] }));
      return { previous };
    },
    onError: (_error, _variables, context) => rollback(context?.previous),
    onSettled: invalidate,
  });

  const mergeMutation = useMutation({
    mutationFn: (items) => mergeCartRemote(token, items),
    onSuccess: invalidate,
  });

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    addItem: addItemMutation.mutateAsync,
    setQuantity: setQuantityMutation.mutateAsync,
    removeItem: removeItemMutation.mutateAsync,
    setSavedForLater: saveForLaterMutation.mutateAsync,
    clear: clearCartMutation.mutateAsync,
    merge: mergeMutation.mutateAsync,
  };
}
