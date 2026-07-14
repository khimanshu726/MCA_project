import { devWarn } from "./logger";

const STORAGE_KEY = "elite-empressions-recently-viewed";
const MAX_ITEMS = 10;

const safeLocalStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    devWarn("[recentlyViewedStorage] localStorage inaccessible", error?.message || error);
    return null;
  }
};

export function loadRecentlyViewedIds() {
  const store = safeLocalStorage();
  if (!store) return [];

  try {
    const raw = store.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch (error) {
    devWarn("[recentlyViewedStorage] Failed to parse", error?.message || error);
    return [];
  }
}

export function recordRecentlyViewed(productId) {
  const store = safeLocalStorage();
  if (!store || !productId) return;

  const current = loadRecentlyViewedIds().filter((id) => id !== productId);
  const next = [productId, ...current].slice(0, MAX_ITEMS);

  try {
    store.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    devWarn("[recentlyViewedStorage] Failed to persist", error?.message || error);
  }
}
