/**
 * The couriers an admin can hand an order to, and where a customer can track it.
 *
 * Shared by the storefront and the admin app (server/ and admin-app/ both
 * already import from src/), so the dropdown an admin picks from and the link a
 * customer clicks can never disagree about what "delhivery" means.
 *
 * ── On the tracking URLs ────────────────────────────────────────────────
 * These are the couriers' public tracking pages. Courier URLs change without
 * notice, and a wrong one sends a paying customer to a 404 while telling them
 * it's their parcel — worse than showing no link at all. Two consequences:
 *
 *   1. A courier whose URL we can't build gets `trackingUrl: null`. The
 *      customer sees the tracking number as plain text, which is honest and
 *      still copy-pasteable into the courier's own site.
 *   2. The admin sees the generated link before saving (see the shipment panel),
 *      so a broken URL is caught by staff rather than by a customer.
 *
 * `other` exists because a print shop's local courier won't be in any list.
 * ────────────────────────────────────────────────────────────────────────
 */

export const COURIERS = [
  {
    id: "delhivery",
    name: "Delhivery",
    trackingUrl: (awb) => `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`,
  },
  {
    id: "bluedart",
    name: "Blue Dart",
    trackingUrl: (awb) =>
      `https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&trackNo=${encodeURIComponent(awb)}`,
  },
  {
    id: "dtdc",
    name: "DTDC",
    trackingUrl: (awb) => `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${encodeURIComponent(awb)}`,
  },
  {
    id: "xpressbees",
    name: "XpressBees",
    trackingUrl: (awb) => `https://www.xpressbees.com/shipment/tracking?awb=${encodeURIComponent(awb)}`,
  },
  {
    id: "ekart",
    name: "Ekart",
    trackingUrl: (awb) => `https://ekartlogistics.com/shipmenttrack/${encodeURIComponent(awb)}`,
  },
  {
    id: "indiapost",
    name: "India Post",
    // India Post's tracking is a stateful form post, not a GET with the
    // consignment in the URL, so there is no link to build. The number is
    // shown as text and pastes into their site.
    trackingUrl: null,
  },
  {
    id: "other",
    name: "Other / local courier",
    trackingUrl: null,
  },
];

export const COURIER_IDS = COURIERS.map((courier) => courier.id);

export const getCourier = (courierId) => COURIERS.find((courier) => courier.id === courierId) || null;

export const getCourierName = (courierId) => getCourier(courierId)?.name || "";

/**
 * The URL to track a shipment, or null when we can't build one honestly —
 * unknown courier, no tracking number, or a courier with no linkable page.
 * Callers render plain text on null rather than a dead link.
 */
export const buildTrackingUrl = (courierId, trackingId) => {
  const courier = getCourier(courierId);
  const awb = String(trackingId || "").trim();

  if (!courier || !awb || typeof courier.trackingUrl !== "function") {
    return null;
  }

  return courier.trackingUrl(awb);
};
