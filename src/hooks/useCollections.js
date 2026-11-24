import { useQuery } from "@tanstack/react-query";
import { getCollection, listCollections } from "../api/collectionsApi";

export function useCollections({ category, categories, enabled = true } = {}) {
  return useQuery({
    queryKey: ["collections", { category, categories }],
    queryFn: () => listCollections({ category, categories }),
    select: (data) => data.collections ?? [],
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useCollection(slug) {
  return useQuery({
    queryKey: ["collection", slug],
    queryFn: () => getCollection(slug),
    enabled: Boolean(slug),
    select: (data) => data.collection,
    retry: false,
  });
}
