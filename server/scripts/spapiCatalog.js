/**
 * Pure helpers for Amazon SP-API Catalog Items (v2022-04-01) image data. No
 * network here so it stays testable; the HTTP/LWA calls live in
 * fetchAmazonImages.js.
 *
 * A getCatalogItem response with includedData=images looks like:
 *   { asin, images: [ { marketplaceId, images: [ { variant, link, height, width }, … ] } ] }
 * where the same `variant` (MAIN, PT01, …) appears at several resolutions.
 */

// MAIN first, then PT01, PT02, …, then anything else (SWCH, etc.).
export const variantRank = (variant) => {
  if (variant === "MAIN") return 0;
  const pt = /^PT0*(\d+)$/i.exec(variant || "");
  if (pt) return Number(pt[1]);
  return 900;
};

/**
 * From a getCatalogItem response, return one image per variant — the
 * highest-resolution one — ordered MAIN → PT01 → PT02 → … Never a thumbnail
 * when a larger version is offered.
 */
export const selectBestImages = (catalogItem, marketplaceId) => {
  const blocks = catalogItem?.images || [];
  const block = (marketplaceId && blocks.find((b) => b.marketplaceId === marketplaceId)) || blocks[0];
  const entries = block?.images || [];

  const bestByVariant = new Map();
  for (const img of entries) {
    if (!img?.link) continue;
    const variant = img.variant || "MAIN";
    const area = (Number(img.width) || 0) * (Number(img.height) || 0);
    const current = bestByVariant.get(variant);
    if (!current || area > current.area) {
      bestByVariant.set(variant, { variant, link: img.link, width: img.width, height: img.height, area });
    }
  }

  return [...bestByVariant.values()]
    .sort((a, b) => variantRank(a.variant) - variantRank(b.variant))
    .map(({ area, ...rest }) => rest);
};
