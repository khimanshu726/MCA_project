import { validateGstin } from "../../src/utils/gst.js";

/**
 * Seller GST settings, read from the environment at call time (so tests and a
 * restart pick up changes).
 *
 * SELLER_GSTIN — the shop's GSTIN, exactly as on the registration certificate.
 *   Checked with the official check character; an invalid value is treated as
 *   not configured (and reported) rather than printed on invoices.
 * GST_ENABLED — "true" switches on GST charging. Off until every product has a
 *   confirmed HSN code; GST charging itself ships separately.
 */
export const getSellerGstin = () => {
  const raw = process.env.SELLER_GSTIN || "";
  if (!raw) return { configured: false, valid: false, gstin: null, stateCode: null, reason: "SELLER_GSTIN is not set." };
  const result = validateGstin(raw);
  return {
    configured: result.valid,
    valid: result.valid,
    gstin: result.valid ? result.gstin : null,
    stateCode: result.stateCode,
    reason: result.reason,
  };
};

export const isGstChargingEnabled = () => process.env.GST_ENABLED === "true";
