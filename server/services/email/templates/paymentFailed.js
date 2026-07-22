import { BRAND, STOREFRONT_URL, button, escapeHtml, formatMoney, renderLayout, sectionLabel } from "./layout.js";

/** Payment-failed email with the reason (if known) and a retry CTA. */
export const paymentFailed = (order, { reason = "" } = {}) => {
  const retryUrl = `${STOREFRONT_URL}/payment-failed?orderId=${encodeURIComponent(order.orderId)}`;
  const bodyHtml = `
    <table role="presentation" width="100%" style="margin:4px 0 20px;background:#fdf1ee;border-radius:10px;">
      <tr><td style="padding:14px 16px;">
        ${sectionLabel("Order")}
        <div style="color:${BRAND.ink};font-size:16px;font-weight:700;">${escapeHtml(order.orderId)}</div>
        <div style="color:${BRAND.muted};font-size:13px;margin-top:2px;">Amount: ${formatMoney(order.price)}</div>
      </td></tr>
    </table>
    ${reason ? `${sectionLabel("Reason")}<p style="margin:0 0 16px;color:${BRAND.text};font-size:14px;">${escapeHtml(reason)}</p>` : ""}
    <p style="margin:0 0 8px;color:${BRAND.text};font-size:14px;line-height:1.6;">No money has been taken. Your items are still reserved — you can complete the payment below.</p>
    ${button("Retry payment", retryUrl)}
    <p style="margin:18px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">If you keep seeing this, reply to this email and we'll help you complete your order.</p>
  `;
  return {
    subject: `Payment could not be completed · ${order.orderId} · ${BRAND.name}`,
    html: renderLayout({
      heading: "Your payment didn't go through",
      subheading: "It happens — your order is still reserved and you can retry.",
      preheader: `Payment failed for order ${order.orderId} — retry available`,
      bodyHtml,
    }),
    text: [
      `Hi ${order.customerName},`,
      "",
      `We couldn't complete the payment for order ${order.orderId} (${formatMoney(order.price)}).`,
      reason ? `Reason: ${reason}` : "",
      "No money has been taken and your items are still reserved.",
      "",
      `Retry payment: ${retryUrl}`,
      "— Elite Impressions",
    ]
      .filter((l) => l !== "")
      .join("\n"),
  };
};
