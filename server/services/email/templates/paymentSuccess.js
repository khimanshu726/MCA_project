import {
  BRAND,
  STOREFRONT_URL,
  button,
  escapeHtml,
  formatMoney,
  orderItemsTable,
  renderLayout,
  sectionLabel,
  totalsBlock,
} from "./layout.js";

/**
 * Standalone payment-success receipt. In the live order flow the online
 * order-confirmation email already carries the payment id + "Paid", so this is
 * not sent in-flow (that would duplicate). It exists as a reusable, testable
 * template (used by the dev test endpoint / future flows).
 */
export const paymentSuccess = (order, payment = {}) => {
  const paymentId = payment.razorpayPaymentId || order.razorpayPaymentId || "";
  const bodyHtml = `
    <table role="presentation" width="100%" style="margin:4px 0 20px;background:${BRAND.surface};border-radius:10px;">
      <tr>
        <td style="padding:14px 16px;">${sectionLabel("Order")}<div style="color:${BRAND.ink};font-size:16px;font-weight:700;">${escapeHtml(order.orderId)}</div></td>
        <td style="padding:14px 16px;text-align:right;">${sectionLabel("Amount paid")}<div style="color:${BRAND.ink};font-size:16px;font-weight:700;">${formatMoney(order.price)}</div></td>
      </tr>
      ${paymentId ? `<tr><td colspan="2" style="padding:0 16px 14px;">${sectionLabel("Payment ID")}<div style="color:${BRAND.text};font-size:13px;font-family:monospace;">${escapeHtml(paymentId)}</div></td></tr>` : ""}
    </table>
    ${sectionLabel("Invoice summary")}
    ${orderItemsTable(order)}
    <div style="height:16px;"></div>
    ${totalsBlock(order)}
    <div style="height:24px;"></div>
    ${button("View your order", `${STOREFRONT_URL}/order-success/${encodeURIComponent(order.orderId)}`)}
  `;
  return {
    subject: `Payment received · ${order.orderId} · ${BRAND.name}`,
    html: renderLayout({
      heading: "Payment successful",
      subheading: `We've received your payment of ${formatMoney(order.price)}.`,
      preheader: `Payment received for order ${order.orderId}`,
      bodyHtml,
    }),
    text: [
      `Hi ${order.customerName},`,
      "",
      `We've received your payment of ${formatMoney(order.price)}.`,
      `Order: ${order.orderId}`,
      paymentId ? `Payment ID: ${paymentId}` : "",
      "",
      `View your order: ${STOREFRONT_URL}/order-success/${order.orderId}`,
      "— Elite Impressions",
    ]
      .filter((l) => l !== "")
      .join("\n"),
  };
};
