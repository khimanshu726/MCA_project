import { request } from "../lib/api";

export const listProducts = ({ category, q, sort, page, limit, featured, ids } = {}) => {
  const params = new URLSearchParams();

  if (category && category !== "All") params.set("category", category);
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  if (typeof featured === "boolean") params.set("featured", String(featured));
  if (Array.isArray(ids) && ids.length) params.set("ids", ids.join(","));

  const query = params.toString();
  return request(`/products${query ? `?${query}` : ""}`);
};

export const getProduct = (id) => request(`/products/${id}`);

export const getFrequentlyBoughtTogether = (id, limit = 4) =>
  request(`/products/${id}/frequently-bought-together?limit=${limit}`);
