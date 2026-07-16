import { dataUrlToFile } from "./engine/exportDesign.js";

/**
 * Handoff between the studio and checkout: when a customized product is
 * added to the cart, the flattened print file is parked here
 * (sessionStorage) and CheckoutReviewPage attaches it as the order's
 * design file automatically — the customer doesn't upload anything twice.
 */

const STORAGE_KEY = "ee-pending-design";

export function storePendingDesign({ productId, productName, printFiles, optionsSummary }) {
  const payload = {
    productId,
    productName,
    optionsSummary: optionsSummary || "",
    // First side becomes the attached file; additional sides are kept while
    // storage allows (multi-side products attach as one file per print run).
    files: printFiles.map((file) => ({ sideId: file.sideId, dataUrl: file.dataUrl, dpi: file.dpi })),
    createdAt: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    // Quota: retry with just the first side before giving up.
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, files: payload.files.slice(0, 1) }));
      return true;
    } catch {
      return false;
    }
  }
}

export function loadPendingDesign() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingDesign() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

/** Convert the stored print file into a File for the order's designFile. */
export function pendingDesignToFile(pending) {
  const first = pending?.files?.[0];
  if (!first) {
    return null;
  }

  const extension = first.dataUrl.startsWith("data:image/png") ? "png" : "jpg";
  const safeName = (pending.productName || pending.productId || "design").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return dataUrlToFile(first.dataUrl, `${safeName}-print-${first.sideId}.${extension}`);
}
