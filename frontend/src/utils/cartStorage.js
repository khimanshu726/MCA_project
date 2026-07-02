/**
 * Cart storage utilities.
 *
 * Security note: The cart holds only non-sensitive product identifiers,
 * names, prices, and quantities (no auth tokens, no PII). It is kept in
 * `sessionStorage` so it never persists across tab sessions and cannot be
 * silently exfiltrated by a compromised persistent script. Cart state is
 * merged with the authenticated user's server cart on next login for cross-
 * device continuity.
 */

import { devWarn } from "./logger";

const CART_STORAGE_KEY = "elite-empressions-cart-items";

const safeStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch (error) {
    devWarn("[cartStorage] sessionStorage inaccessible", error?.message || error);
    return null;
  }
};

const normalizeStoredItem = (item) => ({
  ...item,
  quantity: Math.max(1, Number(item.quantity) || 1),
});

export function loadCartItems() {
  const store = safeStorage();
  if (!store) return [];

  try {
    const rawValue = store.getItem(CART_STORAGE_KEY);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue
      .filter((item) => item && typeof item.id === "string")
      .map(normalizeStoredItem);
  } catch (error) {
    devWarn("[cartStorage] Failed to parse cart items", error?.message || error);
    return [];
  }
}

export function persistCartItems(cartItems) {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  } catch (error) {
    devWarn("[cartStorage] Failed to persist cart items", error?.message || error);
  }
}
