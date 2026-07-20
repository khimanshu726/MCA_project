/**
 * Centralized product-image URL handling.
 *
 * Product images in this app are arbitrary external URLs (an admin pastes a
 * link; seed data points at Pexels stock photos) — there is no first-party
 * CDN or upload pipeline in front of them (see server/config/cloudinary.js,
 * which is wired up for order design-file uploads only, never product
 * images). That means we can only request a resized/optimized variant for
 * hosts whose URL scheme we actually recognize; every other host is passed
 * through unchanged rather than guessing at query params that host won't
 * honor.
 */

const PEXELS_HOST = "images.pexels.com";
const CLOUDINARY_HOST = "res.cloudinary.com";

const parseUrl = (src) => {
  try {
    return new URL(src);
  } catch {
    return null;
  }
};

/**
 * Requests an appropriately-sized variant of a product image for known
 * hosts. `width` should be the image's rendered CSS width (or the largest
 * width it'll ever render at) so the browser never downloads more pixels
 * than it can show.
 */
export function getOptimizedImageUrl(src, { width } = {}) {
  if (!src || !width) return src;

  const url = parseUrl(src);
  if (!url) return src;

  if (url.hostname === PEXELS_HOST) {
    // Seed data URLs already carry a baked-in w/h/fit=crop (see
    // createImageSet in src/data.js) sized for a full product-gallery
    // image. Overriding just `w` while leaving that `h` in place made
    // Pexels crop to a mismatched box — e.g. w=44 with a leftover h=1120
    // renders a razor-thin sliver of the photo, which object-fit: cover
    // then stretches to fill the thumbnail, looking absurdly zoomed in.
    // Drop any pre-existing crop params so Pexels just scales
    // proportionally by width; the .image-shell container's own
    // aspect-ratio + object-fit: cover already does the real crop-to-shape.
    url.searchParams.delete("h");
    url.searchParams.delete("fit");
    url.searchParams.set("auto", "compress");
    url.searchParams.set("cs", "tinysrgb");
    url.searchParams.set("w", String(Math.round(width)));
    return url.toString();
  }

  if (url.hostname === CLOUDINARY_HOST) {
    // Cloudinary transforms are path segments (.../upload/w_400,q_auto,f_auto/...),
    // not query params — only rewrite URLs that follow the standard
    // .../upload/<rest> shape rather than guessing at a different layout.
    const uploadIndex = url.pathname.indexOf("/upload/");
    if (uploadIndex === -1) return src;

    const before = url.pathname.slice(0, uploadIndex + "/upload/".length);
    const after = url.pathname.slice(uploadIndex + "/upload/".length);
    url.pathname = `${before}w_${Math.round(width)},q_auto,f_auto/${after}`;
    return url.toString();
  }

  return src;
}

/** Builds a small set of width variants for `srcSet`, for hosts that support it. */
export function getImageSrcSet(src, widths) {
  const url = parseUrl(src);
  if (!url || !(url.hostname === PEXELS_HOST || url.hostname === CLOUDINARY_HOST)) {
    return undefined;
  }

  return widths.map((width) => `${getOptimizedImageUrl(src, { width })} ${width}w`).join(", ");
}

/**
 * Warms the browser's HTTP cache for images likely to be needed next (e.g.
 * a product's secondary gallery images on card hover, before the detail
 * page ever mounts an <img> for them).
 */
export function warmImageCache(urls = []) {
  urls.filter(Boolean).forEach((url) => {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  });
}
