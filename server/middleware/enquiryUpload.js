import { ARTWORK_TYPES, createLazyUploader } from "../config/uploadStorage.js";

/**
 * Optional sample file attached to an institutional bulk-quote request
 * (multipart, field "sampleFile").
 *
 * Institutions may attach a reference sample of the item they want printed —
 * often a scanned PDF of last year's paper or a page image — so it accepts
 * print-ready PDFs as well as images, at the same 10MB cap as order artwork.
 *
 * Mirrors middleware/orderUpload.js: the storage driver and the production
 * durability guard live in config/uploadStorage.js, so a real submission's
 * sample is never written to an ephemeral Render disk without the route's
 * durability guard reporting it.
 */
export const uploadEnquirySampleFile = createLazyUploader({
  field: "sampleFile",
  folder: "enquiries",
  diskPrefix: "enquiry",
  allowedTypes: ARTWORK_TYPES,
  typeLabel: "PDF, PNG, and JPG",
  maxBytes: 10 * 1024 * 1024,
});
