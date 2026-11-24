import { useSyncExternalStore } from "react";

/**
 * The photo a customer uploaded for each personalised product, remembered in
 * this browser: productId → { id, url, name }. The card, product page, cart and
 * checkout all read it from here, and the order line sends the photo's id.
 *
 * Kept outside the cart on purpose, so the guest cart, the signed-in server
 * cart and Buy Now all carry the photo the same way. Storage can be missing or
 * refuse writes (private mode, blocked site data): every access is guarded and
 * the in-memory copy keeps working for this visit.
 */
const STORAGE_KEY = "elite-personal-photos";
const listeners = new Set();

const readStored = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

let photos = typeof window === "undefined" ? {} : readStored();

const emit = () => listeners.forEach((listener) => listener());

const persist = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch {
    // Remembered for this visit only.
  }
  emit();
};

if (typeof window !== "undefined") {
  // Another tab uploaded or changed a photo.
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      photos = readStored();
      emit();
    }
  });
}

export const getPersonalPhoto = (productId) => photos[productId] || null;

export const setPersonalPhoto = (productId, photo) => {
  if (!productId || !photo?.id || !photo?.url) return;
  photos = { ...photos, [productId]: { id: photo.id, url: photo.url, name: photo.name || "" } };
  persist();
};

export const clearPersonalPhoto = (productId) => {
  if (!photos[productId]) return;
  const { [productId]: _removed, ...rest } = photos;
  photos = rest;
  persist();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Every remembered photo, productId → photo; re-renders when any changes. */
export const usePersonalPhotoMap = () =>
  useSyncExternalStore(
    subscribe,
    () => photos,
    () => EMPTY,
  );
const EMPTY = {};

/** The photo uploaded for this product, or null; re-renders when it changes. */
export const usePersonalPhoto = (productId) =>
  useSyncExternalStore(
    subscribe,
    () => getPersonalPhoto(productId),
    () => null,
  );
