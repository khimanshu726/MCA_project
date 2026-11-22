import { resolveStorefrontStatus } from "../utils/spaRoutes.js";

const isPageRequest = (req) =>
  req.method === "GET" &&
  !req.path.startsWith("/api") &&
  !req.path.startsWith("/uploads") &&
  !req.path.startsWith("/assets") &&
  !/^\/admin(?:\/|$)/.test(req.path) &&
  !/\.[a-z0-9]+$/i.test(req.path); // files are express.static's job

/**
 * Decides, once per storefront page request, whether the URL is a real page
 * (200) or not (404). The result is left on res.locals for the two handlers
 * that send the HTML: the crawler prerender and the plain SPA catch-all.
 * The resolved product (if any) is passed along so the prerender doesn't look
 * it up a second time.
 */
export const createStorefrontStatus =
  (options = {}) =>
  async (req, res, next) => {
    if (!isPageRequest(req)) return next();

    const { status, product, collection, redirect } = await resolveStorefrontStatus(req.path, options);
    if (status === 301 && redirect) {
      return res.redirect(301, redirect);
    }
    res.locals.storefrontStatus = status;
    res.locals.storefrontProduct = product;
    res.locals.storefrontCollection = collection ?? null;
    return next();
  };
