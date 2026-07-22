import {
  BRAND,
  STOREFRONT_URL,
  addressBlock,
  button,
  escapeHtml,
  formatDate,
  formatMoney,
  orderItemsTable,
  paymentMethodLabel,
  renderLayout,
  resolveLineItems,
  sectionLabel,
  totalsBlock,
} from "./layout.js";

/**
 * Customer order-confirmation email. Fires when an order is actually confirmed
 * (COD at placement, online at payment capture). For a paid online order it
 * also surfaces the payment id + "Payment successful", so it serves as the
 * payment-success email too — one email per event, never two.
 */
export const orderConfirmation = (order) => {
  const isPaid = order.paymentStatus === "Paid";
  const subject = `Order confirmed · ${order.orderId} · ${BRAND.name}`;

  const metaRow = `
    <table role="presentation" width="100%" style="margin:4px 0 20px;background:${BRAND.surface};border-radius:10px;">
      <tr>
        <td style="padding:14px 16px;">
          ${sectionLabel("Order number")}
          <div style="color:${BRAND.ink};font-size:16px;font-weight:700;">${escapeHtml(order.orderId)}</div>
        </td>
        <td style="padding:14px 16px;text-align:right;">
          ${sectionLabel("Payment")}
          <div style="color:${BRAND.ink};font-size:14px;font-weight:600;">${escapeHtml(paymentMethodLabel(order.paymentMethod))} · ${escapeHtml(order.paymentStatus)}</div>
        </td>
      </tr>
      ${
        isPaid && order.razorpayPaymentId
          ? `<tr><td colspan="2" style="padding:0 16px 14px;">${sectionLabel("Payment ID")}<div style="color:${BRAND.text};font-size:13px;font-family:monospace;">${escapeHtml(order.razorpayPaymentId)}</div></td></tr>`
          : ""
      }
    </table>`;

  const delivery = formatDate(order.expectedDeliveryDate);
  const deliveryRow = delivery
    ? `<p style="margin:16px 0 0;color:${BRAND.text};font-size:14px;">Estimated delivery: <strong>${escapeHtml(delivery)}</strong></p>`
    : "";

  const bodyHtml = `
    ${metaRow}
    ${orderItemsTable(order)}
    <div style="height:16px;"></div>
    ${totalsBlock(order)}
    ${deliveryRow}
    <div style="height:24px;"></div>
    ${sectionLabel("Delivery address")}
    ${addressBlock(order)}
    <div style="height:24px;"></div>
    ${button("View your order", `${STOREFRONT_URL}/order-success/${encodeURIComponent(order.orderId)}`)}
    <p style="margin:18px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">We'll email you again as soon as your order ships. Questions? Just reply to this email.</p>
  `;

  const items = resolveLineItems(order);
  const addr = order.address || {};
  const addressLines = [addr.street, addr.landmark, [addr.city, addr.state].filter(Boolean).join(", "), addr.pincode].filter(
    (l) => l && String(l).trim(),
  );
  const text = [
    `Hi ${order.customerName},`,
    "",
    "Your order is confirmed.",
    "",
    `Order number: ${order.orderId}`,
    `Payment: ${paymentMethodLabel(order.paymentMethod)} (${order.paymentStatus})`,
    isPaid && order.razorpayPaymentId ? `Payment ID: ${order.razorpayPaymentId}` : "",
    "",
    "Items:",
    ...items.map((i) => `  - ${i.name} x${i.quantity} — ${formatMoney(i.totalPrice)}`),
    "",
    order.subtotal ? `Subtotal: ${formatMoney(order.subtotal)}` : "",
    order.discountTotal > 0 ? `Discount${order.couponCode ? ` (${order.couponCode})` : ""}: -${formatMoney(order.discountTotal)}` : "",
    `Total: ${formatMoney(order.price)}`,
    delivery ? `Estimated delivery: ${delivery}` : "",
    "",
    "Delivery address:",
    `  ${order.customerName}`,
    ...addressLines.map((l) => `  ${l}`),
    "",
    `View your order: ${STOREFRONT_URL}/order-success/${order.orderId}`,
    "— Elite Impressions",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject,
    html: renderLayout({
      heading: `Thanks, ${order.customerName}!`,
      subheading: "Your order is confirmed and we've started getting it ready.",
      preheader: `Order ${order.orderId} confirmed — ${formatMoney(order.price)}`,
      bodyHtml,
    }),
    text,
  };
};
