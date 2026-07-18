/**
 * The Buy Now purchase session.
 *
 * A Buy Now purchase is deliberately NOT a cart. The customer's cart is a
 * durable, cross-device thing they curated; a Buy Now is a single-item
 * intent that exists only for the length of one checkout. Writing it into
 * the cart (and deleting it afterwards) would mean a failed payment or a
 * closed tab could silently mutate a cart the customer never touched.
 *
 * Storage is `sessionStorage`, chosen for three properties this flow needs:
 *
 *  - It survives a refresh and a same-tab redirect (the guest -> /login ->
 *    back-to-checkout round trip), which `useState` and React Router
 *    location state do not.
 *  - It is scoped per tab. Two tabs buying two different products is the
 *    correct reading of "multiple tabs" — a shared store would have the
 *    second tab silently overwrite the first customer's checkout.
 *  - It dies with the tab, so an abandoned Buy Now leaves nothing behind.
 *
 * A TTL is enforced on top, so a tab left open overnight doesn't resume a
 * checkout against day-old prices. Expiry is checked on read rather than by
 * timer: a timer doesn't survive the refresh this store exists to survive.
 */

const STORAGE_KEY = "ee-buy-now-session";

/** How long a Buy Now checkout stays resumable. */
export const BUY_NOW_TTL_MS = 30 * 60 * 1000;

export const BUY_NOW_EXPIRED = "BUY_NOW_EXPIRED";

/**
 * @param {object} input
 * @param {string} input.productId
 * @param {number} input.quantity
 * @param {object} [input.customization] Studio/personalization payload carried
 *   verbatim to checkout: uploaded images, text, fonts, colours, positioning,
 *   canvas edits, notes. Deliberately an opaque bag — this module never
 *   interprets it, so new customization fields (and, later, variant/size/
 *   colour selections) need no change here.
 * @param {number} [input.unitPriceAtStart] Price the customer was shown when
 *   they clicked Buy Now, used to detect a price change mid-checkout.
 */
export function storeBuyNowSession({ productId, quantity, customization = null, unitPriceAtStart = null }) {
  if (!productId || !Number.isFinite(Number(quantity)) || Number(quantity) < 1) {
    return null;
  }

  const now = Date.now();
  const session = {
    productId,
    quantity: Math.floor(Number(quantity)),
    customization,
    unitPriceAtStart,
    createdAt: now,
    expiresAt: now + BUY_NOW_TTL_MS,
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  } catch {
    // Private-mode / quota. The caller decides whether to fall back; it must
    // not proceed into a checkout whose state it couldn't persist, because a
    // refresh would drop the customer onto an empty checkout.
    return null;
  }
}

/**
 * Reads the active session, or null when there is none. An expired session is
 * cleared and reported as `{ expired: true }` so the UI can say "this
 * checkout timed out" rather than the much more confusing "nothing here".
 */
export function loadBuyNowSession() {
  let raw = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  let session = null;
  try {
    session = JSON.parse(raw);
  } catch {
    clearBuyNowSession();
    return null;
  }

  if (!session?.productId || !session.quantity) {
    clearBuyNowSession();
    return null;
  }

  if (typeof session.expiresAt === "number" && Date.now() > session.expiresAt) {
    clearBuyNowSession();
    return { expired: true };
  }

  return session;
}

/** Updates quantity in place, preserving the original expiry window. */
export function updateBuyNowQuantity(quantity) {
  const current = loadBuyNowSession();
  if (!current || current.expired) {
    return null;
  }

  const next = Math.floor(Number(quantity));
  if (!Number.isFinite(next) || next < 1) {
    return current;
  }

  // The expiry deliberately does NOT slide forward on a quantity change.
  // The window exists to bound how stale the *price* can be, and changing
  // the quantity doesn't re-fetch the price.
  const updated = { ...current, quantity: next };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return current;
  }
}

export function clearBuyNowSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

export function hasBuyNowSession() {
  const session = loadBuyNowSession();
  return Boolean(session && !session.expired);
}
