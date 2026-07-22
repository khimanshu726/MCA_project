import {
  BRAND,
  STOREFRONT_URL,
  addressBlock,
  button,
  escapeHtml,
  formatMoney,
  orderItemsTable,
  paymentMethodLabel,
  renderLayout,
  resolveLineItems,
  sectionLabel,
} from "./layout.js";

/** Internal alert to the shop when a new order is confirmed. */
export const adminNewOrder = (order) => {
  const bodyHtml = `
    <table role="presentation" width="100%" style="margin:4px 0 20px;background:${BRAND.surface};border-radius:10px;">
      <tr>
        <td style="padding:14px 16px;">${sectionLabel("Order")}<div style="color:${BRAND.ink};font-size:16px;font-weight:700;">${escapeHtml(order.orderId)}</div></td>
        <td style="padding:14px 16px;text-align:right;">${sectionLabel("Amount")}<div style="color:${BRAND.ink};font-size:16px;font-weight:700;">${formatMoney(order.price)}</div></td>
      </tr>
      <tr>
        <td style="padding:0 16px 14px;">${sectionLabel("Customer")}<div style="color:${BRAND.text};font-size:14px;">${escapeHtml(order.customerName)}</div><div style="color:${BRAND.muted};font-size:13px;">${escapeHtml(order.phone || "")}${order.email ? ` · ${escapeHtml(order.email)}` : ""}</div></td>
        <td style="padding:0 16px 14px;text-align:right;">${sectionLabel("Payment")}<div style="color:${BRAND.text};font-size:14px;">${escapeHtml(paymentMethodLabel(order.paymentMethod))} · ${escapeHtml(order.paymentStatus)}</div></td>
      </tr>
    </table>
    ${sectionLabel("Products")}
    ${orderItemsTable(order)}
    <div style="height:20px;"></div>
    ${sectionLabel("Shipping address")}
    ${addressBlock(order)}
    <div style="height:24px;"></div>
    ${button("Open in admin", `${STOREFRONT_URL}/admin`)}
  `;
  const items = resolveLineItems(order);
  return {
    subject: `New order ${order.orderId} · ${formatMoney(order.price)}`,
    html: renderLayout({
      heading: "New order received",
      subheading: `${order.customerName} · ${formatMoney(order.price)} · ${paymentMethodLabel(order.paymentMethod)}`,
      preheader: `New order ${order.orderId} from ${order.customerName}`,
      bodyHtml,
    }),
    text: [
      `New order: ${order.orderId}`,
      `Customer: ${order.customerName} (${order.phone || ""}${order.email ? `, ${order.email}` : ""})`,
      `Amount: ${formatMoney(order.price)}`,
      `Payment: ${paymentMethodLabel(order.paymentMethod)} (${order.paymentStatus})`,
      "",
      "Products:",
      ...items.map((i) => `  - ${i.name} x${i.quantity} — ${formatMoney(i.totalPrice)}`),
      "",
      `Address: ${[order.address?.street, order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(", ")}`,
    ].join("\n"),
  };
};
