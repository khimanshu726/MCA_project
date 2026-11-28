import { getProductById } from "../services/productStore.js";
import mongoose from "mongoose";
import { Collection } from "../models/Collection.js";

// Without a live connection mongoose would queue these for 10s; answer
// "none" instead, like a missing collection.
const isDbReady = () => mongoose.connection.readyState === 1;
const findActiveCollectionBySlug = (slug) =>
  isDbReady() ? Collection.findOne({ slug, status: "active" }).lean() : null;
// The collection (if any) that took over a retired product's URL.
const findCollectionForLegacyProduct = (productId) =>
  isDbReady() ? Collection.findOne({ legacyProductIds: productId, status: "active" }).lean() : null;

/**
 * Which URLs are real storefront pages, so the server can answer everything
 * else with a 404 status.
 *
 * The storefront is a single-page app: the server returns the same index.html
 * for every page URL and React Router picks the screen. That used to mean every
 * URL — including /this-page-does-not-exist and /products/<deleted-id> —
 * answered 200 with the home page's metadata, which search engines treat as
 * "soft 404s" (duplicate pages). The browser still gets the app either way and
 * shows its "Page not found" screen; only the HTTP status changes.
 *
 * KEEP IN SYNC with the <Route> paths in src/App.jsx. spaRoutes.test.js fails
 * if a route is added there and not here.
 */
export const STOREFRONT_STATIC_PATHS = [
  "/",
  "/products",
  "/institutions",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/cart",
  "/checkout",
  "/checkout/address",
  "/checkout/review",
  "/account",
  "/wishlist",
  "/account/orders",
  "/account/addresses",
  "/account/designs",
  "/order-success",
  "/payment-failed",
  "/customize",
  "/login",
  "/register",
  "/auth/action",
];

// Paths with one id segment. Product pages are additionally checked against the
// catalog; the others are private or per-session pages that render their own
// "not found" state and are not indexed anyway.
export const STOREFRONT_DYNAMIC_PATTERNS = [
  /^\/products\/[^/]+$/,
  /^\/collections\/[^/]+$/,
  /^\/account\/orders\/[^/]+$/,
  /^\/order-success\/[^/]+$/,
  /^\/customize\/[^/]+$/,
];

const STATIC_SET = new Set(STOREFRONT_STATIC_PATHS);

/** "/products/" and "/products" are the same page. */
export const normalizeStorefrontPath = (pathname = "/") =>
  pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;

export const isKnownStorefrontPath = (pathname) => {
  const normalized = normalizeStorefrontPath(pathname);
  return STATIC_SET.has(normalized) || STOREFRONT_DYNAMIC_PATTERNS.some((pattern) => pattern.test(normalized));
};

const PRODUCT_PATH = /^\/products\/([^/]+)$/;
const COLLECTION_PATH = /^\/collections\/([^/]+)$/;

// undefined = not that kind of URL; null = one whose id can't be decoded
// (malformed %-escape), which can't be anything we have.
const idFromPath = (pattern) => (pathname) => {
  const match = normalizeStorefrontPath(pathname).match(pattern);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};
const productIdFromPath = idFromPath(PRODUCT_PATH);
const collectionSlugFromPath = idFromPath(COLLECTION_PATH);

/**
 * Resolves the HTTP status for a storefront page request: 200 for a real page,
 * 404 for an unknown path or a product that doesn't exist or isn't on sale
 * (the product API hides non-active products the same way).
 *
 * `findProduct` is injectable for tests. A lookup failure (DB down) answers 200
 * — a temporary outage must not tell search engines a live product is gone.
 */
export const resolveStorefrontStatus = async (
  pathname,
  {
    findProduct = getProductById,
    findCollection = findActiveCollectionBySlug,
    findLegacyCollection = findCollectionForLegacyProduct,
  } = {},
) => {
  if (!isKnownStorefrontPath(pathname)) {
    return { status: 404, product: null };
  }

  const slug = collectionSlugFromPath(pathname);
  if (slug !== undefined) {
    if (slug === null) return { status: 404, product: null };
    try {
      const collection = await findCollection(slug);
      return collection ? { status: 200, product: null, collection } : { status: 404, product: null };
    } catch (error) {
      console.error("[spaRoutes] collection lookup failed, answering 200:", error?.message || error);
      return { status: 200, product: null };
    }
  }

  const productId = productIdFromPath(pathname);
  if (productId === undefined) {
    return { status: 200, product: null };
  }
  if (productId === null) {
    return { status: 404, product: null };
  }

  try {
    const product = await findProduct(productId);
    if (product && product.status === "active") {
      return { status: 200, product };
    }
    // A retired product a collection took over (e.g. the old single
    // "wedding-suite" page): send visitors and search engines there.
    const collection = await findLegacyCollection(productId);
    if (collection) {
      return { status: 301, product: null, redirect: `/collections/${collection.slug}` };
    }
    return { status: 404, product: null };
  } catch (error) {
    console.error("[spaRoutes] product lookup failed, answering 200:", error?.message || error);
    return { status: 200, product: null };
  }
};
