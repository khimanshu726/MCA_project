/**
 * Cart storage utilities.
 *
 * Security note: the cart holds only non-sensitive product identifiers,
 * names, prices, and quantities (no auth tokens, no PII). It is kept in
 * `localStorage` so a guest's cart survives across browser sessions and tab
 * closes. Stale entries (referencing deleted/repriced products) are handled
 * by re-resolving against the live product API on read, not by expiring the
 * storage itself.
 */

import { devWarn } from "./logger";

const CART_STORAGE_KEY = "elite-empressions-cart-items-v2";
const LEGACY_SESSION_STORAGE_KEY = "elite-empressions-cart-items";

const safeLocalStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    devWarn("[cartStorage] localStorage inaccessible", error?.message || error);
    return null;
  }
};

const safeSessionStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const normalizeStoredItem = (item) => ({
  ...item,
  quantity: Math.max(1, Number(item.quantity) || 1),
});

const parseStoredItems = (rawValue) => {
  if (!rawValue) return [];

  try {
    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter((item) => item && typeof item.id === "string").map(normalizeStoredItem);
  } catch (error) {
    devWarn("[cartStorage] Failed to parse cart items", error?.message || error);
    return [];
  }
};

// One-time migration: earlier versions of this app stored the guest cart in
// sessionStorage, which meant it didn't survive a tab close. Carry any
// leftover items forward once, then drop the old key.
const migrateLegacySessionCart = (store) => {
  const legacySession = safeSessionStorage();
  if (!legacySession) return;

  const legacyRaw = legacySession.getItem(LEGACY_SESSION_STORAGE_KEY);
  if (!legacyRaw) return;

  if (!store.getItem(CART_STORAGE_KEY)) {
    store.setItem(CART_STORAGE_KEY, legacyRaw);
  }

  legacySession.removeItem(LEGACY_SESSION_STORAGE_KEY);
};

export function loadCartItems() {
  const store = safeLocalStorage();
  if (!store) return [];

  migrateLegacySessionCart(store);

  return parseStoredItems(store.getItem(CART_STORAGE_KEY));
}

export function persistCartItems(cartItems) {
  const store = safeLocalStorage();
  if (!store) return;
  try {
    store.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  } catch (error) {
    devWarn("[cartStorage] Failed to persist cart items", error?.message || error);
  }
}
