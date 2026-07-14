import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "../context/UserAuthContext";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../api/addressApi";

const ADDRESS_QUERY_KEY = ["addresses"];

// Authenticated-only, server-backed saved address book — same shape of
// hook as useWishlist.js. Address CRUD isn't latency-sensitive enough to
// warrant optimistic updates; a plain invalidate-on-success keeps this simple.
export function useAddresses() {
  const { token, isAuthenticated } = useUserAuth();
  const queryClient = useQueryClient();

  const addressQuery = useQuery({
    queryKey: ADDRESS_QUERY_KEY,
    queryFn: () => getAddresses(token),
    enabled: Boolean(isAuthenticated && token),
    staleTime: 15_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (payload) => createAddress(token, payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ addressId, payload }) => updateAddress(token, addressId, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (addressId) => deleteAddress(token, addressId),
    onSuccess: invalidate,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (addressId) => setDefaultAddress(token, addressId),
    onSuccess: invalidate,
  });

  return {
    addresses: addressQuery.data?.addresses ?? [],
    isLoading: isAuthenticated ? addressQuery.isLoading : false,
    createAddress: (payload) => createMutation.mutateAsync(payload),
    updateAddress: (addressId, payload) => updateMutation.mutateAsync({ addressId, payload }),
    deleteAddress: (addressId) => deleteMutation.mutateAsync(addressId),
    setDefaultAddress: (addressId) => setDefaultMutation.mutateAsync(addressId),
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}
