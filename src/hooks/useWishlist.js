import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "../context/UserAuthContext";
import { addWishlistItem, clearWishlistRemote, getWishlist, removeWishlistItem } from "../api/wishlistApi";

const WISHLIST_QUERY_KEY = ["wishlist"];

// Wishlist is authenticated-only (no guest/localStorage tier, unlike the
// cart) — simpler mirror of useServerCart.js's optimistic-update pattern,
// without any pricing to recompute.
export function useWishlist() {
  const { token, isAuthenticated } = useUserAuth();
  const queryClient = useQueryClient();

  const wishlistQuery = useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: () => getWishlist(token),
    enabled: Boolean(isAuthenticated && token),
    staleTime: 15_000,
  });

  const applyOptimisticUpdate = (updater) => {
    const previous = queryClient.getQueryData(WISHLIST_QUERY_KEY);
    queryClient.setQueryData(WISHLIST_QUERY_KEY, (current) => (current ? updater(current) : current));
    return previous;
  };

  const rollback = (previous) => {
    if (previous !== undefined) {
      queryClient.setQueryData(WISHLIST_QUERY_KEY, previous);
    }
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: (productId) => addWishlistItem(token, productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });
      const previous = applyOptimisticUpdate((current) => {
        if (current.items.some((item) => item.productId === productId)) {
          return current;
        }
        return {
          ...current,
          items: [...current.items, { productId, addedAt: new Date().toISOString(), product: null, isMissing: false, isOutOfStock: false }],
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => rollback(context?.previous),
    onSettled: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (productId) => removeWishlistItem(token, productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });
      const previous = applyOptimisticUpdate((current) => ({
        ...current,
        items: current.items.filter((item) => item.productId !== productId),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => rollback(context?.previous),
    onSettled: invalidate,
  });

  const clearMutation = useMutation({
    mutationFn: () => clearWishlistRemote(token),
    onSettled: invalidate,
  });

  const items = wishlistQuery.data?.items ?? [];
  const wishlistIds = useMemo(() => new Set(items.map((item) => item.productId)), [items]);

  return {
    items,
    wishlistIds,
    isLoading: isAuthenticated ? wishlistQuery.isLoading : false,
    isAuthenticated,
    addToWishlist: addMutation.mutateAsync,
    removeFromWishlist: removeMutation.mutateAsync,
    clearWishlist: clearMutation.mutateAsync,
  };
}
