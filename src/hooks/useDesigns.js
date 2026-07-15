import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "../context/UserAuthContext";
import {
  createDesignRemote,
  deleteDesignRemote,
  duplicateDesignRemote,
  getDesigns,
  updateDesignRemote,
} from "../api/designsApi";

const DESIGNS_QUERY_KEY = ["designs"];

/**
 * Saved designs ("My Designs") — authenticated-only, following the
 * useWishlist pattern: one list query plus invalidating mutations. The
 * studio uses save/update to persist editor state server-side.
 */
export function useDesigns() {
  const { token, isAuthenticated } = useUserAuth();
  const queryClient = useQueryClient();

  const designsQuery = useQuery({
    queryKey: DESIGNS_QUERY_KEY,
    queryFn: () => getDesigns(token),
    enabled: Boolean(isAuthenticated && token),
    staleTime: 15_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: DESIGNS_QUERY_KEY });

  const saveMutation = useMutation({
    mutationFn: (payload) => createDesignRemote(token, payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ designId, ...payload }) => updateDesignRemote(token, designId, payload),
    onSuccess: invalidate,
  });

  const duplicateMutation = useMutation({
    mutationFn: (designId) => duplicateDesignRemote(token, designId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (designId) => deleteDesignRemote(token, designId),
    onSuccess: invalidate,
  });

  return {
    designs: designsQuery.data?.items ?? [],
    isLoading: designsQuery.isLoading,
    isError: designsQuery.isError,
    isAuthenticated,
    token,
    saveDesign: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    updateDesign: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    duplicateDesign: duplicateMutation.mutateAsync,
    deleteDesign: deleteMutation.mutateAsync,
  };
}
