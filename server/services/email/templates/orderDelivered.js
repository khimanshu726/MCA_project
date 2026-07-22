import { BRAND, STOREFRONT_URL, button, escapeHtml, renderLayout } from "./layout.js";

/** Order-delivered email: thank the customer and invite a review. */
export const orderDelivered = (order) => {
  const reviewUrl = `${STOREFRONT_URL}/order-success/${encodeURIComponent(order.orderId)}`;
  const bodyHtml = `
    <p style="margin:0 0 16px;color:${BRAND.text};font-size:14px;line-height:1.6;">
      Your order <strong>${escapeHtml(order.orderId)}</strong> has been delivered. We hope your prints look fantastic!
    </p>
    <p style="margin:0 0 8px;color:${BRAND.text};font-size:14px;line-height:1.6;">
      If you have a moment, we'd love to hear how it went — your feedback helps other customers and helps us do better.
    </p>
    ${button("Rate your order", reviewUrl)}
    <p style="margin:18px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">Thank you for choosing ${BRAND.name}.</p>
  `;
  return {
    subject: `Delivered · ${order.orderId} · ${BRAND.name}`,
    html: renderLayout({
      heading: `Delivered — enjoy, ${order.customerName}!`,
      subheading: "Your order has arrived.",
      preheader: `Order ${order.orderId} delivered`,
      bodyHtml,
    }),
    text: [
      `Hi ${order.customerName},`,
      "",
      `Your order ${order.orderId} has been delivered. We hope your prints look fantastic!`,
      "",
      `We'd love your feedback: ${reviewUrl}`,
      "",
      "Thank you for choosing Elite Impressions.",
    ].join("\n"),
  };
};
