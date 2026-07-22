import { BRAND, STOREFRONT_URL, button, escapeHtml, formatDate, renderLayout, sectionLabel } from "./layout.js";

/** Order-shipped email: tracking id, courier, expected delivery, track CTA. */
export const orderShipped = (order) => {
  // The order-detail page renders the courier-specific tracking link, so the
  // CTA points there rather than duplicating courier URL logic in the server.
  const trackUrl = `${STOREFRONT_URL}/order-success/${encodeURIComponent(order.orderId)}`;
  const eta = formatDate(order.expectedDeliveryDate);
  const bodyHtml = `
    <table role="presentation" width="100%" style="margin:4px 0 20px;background:${BRAND.surface};border-radius:10px;">
      <tr>
        <td style="padding:14px 16px;">${sectionLabel("Order")}<div style="color:${BRAND.ink};font-size:16px;font-weight:700;">${escapeHtml(order.orderId)}</div></td>
        ${order.courier ? `<td style="padding:14px 16px;text-align:right;">${sectionLabel("Courier")}<div style="color:${BRAND.ink};font-size:14px;font-weight:600;">${escapeHtml(order.courier)}</div></td>` : ""}
      </tr>
      ${order.trackingId ? `<tr><td colspan="2" style="padding:0 16px 14px;">${sectionLabel("Tracking number")}<div style="color:${BRAND.text};font-size:14px;font-family:monospace;">${escapeHtml(order.trackingId)}</div></td></tr>` : ""}
    </table>
    ${eta ? `<p style="margin:0 0 8px;color:${BRAND.text};font-size:14px;">Expected delivery: <strong>${escapeHtml(eta)}</strong></p>` : ""}
    ${button("Track your shipment", trackUrl)}
  `;
  return {
    subject: `Your order has shipped · ${order.orderId} · ${BRAND.name}`,
    html: renderLayout({
      heading: "Your order is on its way!",
      subheading: "It's been handed to the courier and is heading to you.",
      preheader: `Order ${order.orderId} shipped${eta ? ` — arrives ${eta}` : ""}`,
      bodyHtml,
    }),
    text: [
      `Hi ${order.customerName},`,
      "",
      `Good news — your order ${order.orderId} has shipped.`,
      order.courier ? `Courier: ${order.courier}` : "",
      order.trackingId ? `Tracking number: ${order.trackingId}` : "",
      eta ? `Expected delivery: ${eta}` : "",
      "",
      `Track it: ${trackUrl}`,
      "— Elite Impressions",
    ]
      .filter((l) => l !== "")
      .join("\n"),
  };
};
