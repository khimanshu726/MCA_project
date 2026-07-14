import { request } from "../lib/api";

export const getCart = (token) => request("/cart", { token });

export const addCartItem = (token, { productId, quantity }) =>
  request("/cart/items", { method: "POST", body: { productId, quantity }, token });

export const updateCartItem = (token, productId, { quantity }) =>
  request(`/cart/items/${encodeURIComponent(productId)}`, { method: "PATCH", body: { quantity }, token });

export const removeCartItem = (token, productId) =>
  request(`/cart/items/${encodeURIComponent(productId)}`, { method: "DELETE", token });

export const toggleSaveForLater = (token, productId, savedForLater) =>
  request(`/cart/items/${encodeURIComponent(productId)}/save-for-later`, {
    method: "PATCH",
    body: { savedForLater },
    token,
  });

export const clearCartRemote = (token) => request("/cart", { method: "DELETE", token });

export const mergeCartRemote = (token, items) =>
  request("/cart/merge", { method: "POST", body: { items }, token });
