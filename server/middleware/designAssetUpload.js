import { createLazyUploader, IMAGE_TYPES } from "../config/uploadStorage.js";

/**
 * Studio image uploads (multipart, field "asset").
 *
 * Images only — studio layers are raster artwork; print PDFs are generated
 * later from the flattened design. The storage driver and the production
 * durability guard live in config/uploadStorage.js, which this file used to
 * duplicate (and, in duplicating, quietly wrote to a disk Render erases).
 */
export const uploadDesignAsset = createLazyUploader({
  field: "asset",
  folder: "designs",
  diskPrefix: "design",
  allowedTypes: IMAGE_TYPES,
  typeLabel: "PNG, JPG, and WebP",
  maxBytes: 10 * 1024 * 1024,
});
