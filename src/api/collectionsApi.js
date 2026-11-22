import { request } from "../lib/api";

// Active collections that have something to buy, with `productCount` and
// `minPrice`. Optionally only those listed under one storefront category.
export const listCollections = ({ category } = {}) => {
  const params = new URLSearchParams();
  if (category && category !== "All") params.set("category", category);
  const query = params.toString();
  return request(`/collections${query ? `?${query}` : ""}`);
};

export const getCollection = (slug) => request(`/collections/${encodeURIComponent(slug)}`);
