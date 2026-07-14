import { request } from "../lib/api";

export const getWishlist = (token) => request("/wishlist", { token });

export const addWishlistItem = (token, productId) =>
  request("/wishlist/items", { method: "POST", body: { productId }, token });

export const removeWishlistItem = (token, productId) =>
  request(`/wishlist/items/${encodeURIComponent(productId)}`, { method: "DELETE", token });

export const clearWishlistRemote = (token) => request("/wishlist", { method: "DELETE", token });
