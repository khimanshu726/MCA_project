import { ARTWORK_TYPES, createLazyUploader } from "../config/uploadStorage.js";

/**
 * Customer artwork attached at checkout (multipart, field "designFile").
 *
 * Accepts print-ready PDFs as well as images, and keeps the 10MB cap: unlike a
 * catalog thumbnail, this is the file the shop actually prints.
 *
 * The storage driver and the production durability guard live in
 * config/uploadStorage.js. This file used to make that choice itself and fall
 * back to local disk — meaning the artwork for a real, paid order was written
 * to a Render filesystem that is erased on the next redeploy, with nothing
 * anywhere reporting the loss.
 */
export const uploadOrderDesignFile = createLazyUploader({
  field: "designFile",
  folder: "orders",
  diskPrefix: "order",
  allowedTypes: ARTWORK_TYPES,
  typeLabel: "PDF, PNG, and JPG",
  maxBytes: 10 * 1024 * 1024,
});
