import { ExternalLink } from "lucide-react";
import { buildTrackingUrl, getCourierName } from "../utils/couriers";

/**
 * Who has the parcel, where to watch it, and when it should arrive.
 *
 * The tracking number used to render as a bare string with no courier beside
 * it — technically present, practically useless: the customer couldn't tell
 * whose number it was, let alone follow it.
 *
 * The link only appears when we can build one honestly. Some couriers (India
 * Post, a local courier under "Other") have no linkable tracking page, so the
 * number stays plain text that pastes into their site. A dead link that claims
 * to be your parcel is worse than no link.
 */
const formatDeliveryDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

function OrderShipmentInfo({ order }) {
  const courierName = getCourierName(order.courier);
  const trackingUrl = buildTrackingUrl(order.courier, order.trackingId);
  const hasEta = Boolean(order.expectedDeliveryDate);

  if (!order.trackingId && !hasEta) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-col gap-1 border-t border-ink-100 pt-3 text-sm">
      {hasEta ? (
        <p className="text-ink-700">
          Expected delivery:{" "}
          <span className="font-semibold text-ink-900">{formatDeliveryDate(order.expectedDeliveryDate)}</span>
        </p>
      ) : null}

      {order.trackingId ? (
        <p className="text-ink-600">
          {courierName ? `${courierName} · ` : ""}
          Tracking: <span className="font-semibold text-ink-900">{order.trackingId}</span>
          {trackingUrl ? (
            <>
              {" "}
              <a
                href={trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
              >
                Track
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export default OrderShipmentInfo;
