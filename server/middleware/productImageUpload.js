import { createLazyUploader, IMAGE_TYPES } from "../config/uploadStorage.js";

/**
 * Product photo uploads (multipart, field "images", up to 8 at once).
 *
 * Images only, and a tighter 5MB cap than order artwork: these are catalog
 * thumbnails rendered on listing pages, not print-resolution source files.
 * Storage driver and the production durability guard both live in
 * config/uploadStorage.js.
 */
export const uploadProductImages = createLazyUploader({
  field: "images",
  multiple: true,
  maxFiles: 8,
  folder: "products",
  diskPrefix: "product",
  allowedTypes: IMAGE_TYPES,
  typeLabel: "PNG, JPG, and WebP",
  maxBytes: 5 * 1024 * 1024,
});
