import { request } from "../lib/api";

/** Public institutional bulk-quote request. No auth token — lead capture. */
export const createEnquiry = (payload) =>
  request("/enquiries", { method: "POST", body: payload, timeoutMs: 8000 });
