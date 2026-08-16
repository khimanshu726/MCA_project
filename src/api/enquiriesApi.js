import { request } from "../lib/api";

/**
 * Public institutional bulk-quote request. No auth token — lead capture.
 * Accepts either a plain object (JSON) or FormData (when a sample file is
 * attached); request() sets the right Content-Type for each. File uploads get a
 * more generous timeout than a plain text submission.
 */
export const createEnquiry = (payload) => {
  const isUpload = typeof FormData !== "undefined" && payload instanceof FormData;
  return request("/enquiries", { method: "POST", body: payload, timeoutMs: isUpload ? 30000 : 8000 });
};
