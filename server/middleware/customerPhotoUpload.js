import { createLazyUploader, IMAGE_TYPES } from "../config/uploadStorage.js";

/**
 * A customer's photo for a personalised product (multipart, field "photo").
 * Images only, 10 MB, stored in Cloudinary's "customer-photos" folder (local
 * disk in development); config/uploadStorage.js owns the driver choice.
 */
export const uploadCustomerPhoto = createLazyUploader({
  field: "photo",
  folder: "customer-photos",
  diskPrefix: "photo",
  allowedTypes: IMAGE_TYPES,
  typeLabel: "PNG, JPG, and WebP",
  maxBytes: 10 * 1024 * 1024,
});
