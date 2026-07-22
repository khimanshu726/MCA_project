import { appConfig } from "../../../config.js";

/**
 * Shared building blocks for every transactional email so branding, colours,
 * and the responsive shell live in exactly one place (templates only supply
 * their body). Table-based + inline styles because that is what email clients
 * (Gmail, Outlook, Apple Mail) actually render reliably.
 */

export const BRAND = {
  name: "Elite Impressions",
  ink: "#17181b",
  accent: "#c65f3a",
  accentDark: "#a94e30",
  text: "#33363b",
  muted: "#8a8f98",
  line: "#ececec",
  surface: "#f6f7f9",
};

export const STOREFRONT_URL = appConfig.storefrontUrl;

export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const paymentMethodLabel = (method) => {
  if (!method) return "Online";
  if (method === "cod") return "Cash on Delivery";
  return method.charAt(0).toUpperCase() + method.slice(1);
};

export const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/** Normalises the two order shapes (multi-item lineItems / legacy single) into rows. */
export const resolveLineItems = (order) => {
  if (Array.isArray(order.lineItems) && order.lineItems.length > 0) {
    return order.lineItems.map((item) => ({
      name: item.name || "Item",
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? 0,
      totalPrice: item.totalPrice ?? (item.unitPrice ?? 0) * (item.quantity ?? 1),
      customizationText: item.customizationText || "",
    }));
  }
  return [
    {
      name: order.productName || "Item",
      quantity: order.quantity ?? 1,
      unitPrice: order.price ?? 0,
      totalPrice: order.price ?? 0,
      customizationText: order.customizationDetails || "",
    },
  ];
};

export const button = (label, url) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;"><tr><td style="border-radius:10px;background:${BRAND.accent};">
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 26px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
  </td></tr></table>`;

/** Itemised products table used by order-related emails. */
export const orderItemsTable = (order) => {
  const rows = resolveLineItems(order)
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.line};">
          <div style="color:${BRAND.ink};font-weight:600;font-size:14px;">${escapeHtml(item.name)}</div>
          ${item.customizationText ? `<div style="color:${BRAND.muted};font-size:13px;margin-top:2px;">${escapeHtml(item.customizationText)}</div>` : ""}
          <div style="color:${BRAND.muted};font-size:13px;margin-top:2px;">Qty ${escapeHtml(item.quantity)} × ${formatMoney(item.unitPrice)}</div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.line};text-align:right;color:${BRAND.ink};font-weight:600;font-size:14px;white-space:nowrap;vertical-align:top;">${formatMoney(item.totalPrice)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
};

/** Price breakdown, ending in a bold total. */
export const totalsBlock = (order) => {
  const rows = [
    ["Subtotal", order.subtotal],
    order.discountTotal > 0 ? [`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, -order.discountTotal] : null,
    order.platformFee > 0 ? ["Platform fee", order.platformFee] : null,
    order.taxAmount > 0 ? ["Tax", order.taxAmount] : null,
    ["Shipping", order.shippingCharge > 0 ? formatMoney(order.shippingCharge) : "Free"],
  ].filter(Boolean);
  const html = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 0;color:${BRAND.muted};font-size:14px;">${escapeHtml(label)}</td><td style="padding:4px 0;text-align:right;color:${BRAND.text};font-size:14px;white-space:nowrap;">${typeof value === "number" ? formatMoney(value) : escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${html}
    <tr><td style="padding:12px 0 0;border-top:2px solid ${BRAND.ink};color:${BRAND.ink};font-size:16px;font-weight:700;">Total</td>
        <td style="padding:12px 0 0;border-top:2px solid ${BRAND.ink};text-align:right;color:${BRAND.ink};font-size:16px;font-weight:700;white-space:nowrap;">${formatMoney(order.price)}</td></tr>
  </table>`;
};

/** Delivery address card. */
export const addressBlock = (order) => {
  const a = order.address || {};
  const lines = [a.street, a.landmark, [a.city, a.state].filter(Boolean).join(", "), a.pincode].filter((l) => l && String(l).trim());
  return `<div style="color:${BRAND.text};font-size:14px;line-height:1.6;">
    <div style="color:${BRAND.ink};font-weight:600;">${escapeHtml(order.customerName)}</div>
    ${lines.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}
    ${order.phone ? `<div style="color:${BRAND.muted};margin-top:4px;">${escapeHtml(order.phone)}</div>` : ""}
  </div>`;
};

export const sectionLabel = (text) =>
  `<div style="color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px;">${escapeHtml(text)}</div>`;

/**
 * Wraps a body in the branded shell (header wordmark, accent strip, footer).
 * `preheader` is the hidden inbox-preview text.
 */
export const renderLayout = ({ heading, subheading, bodyHtml, preheader = "" }) => `<!doctype html>
<html>
  <body style="margin:0;background:${BRAND.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e8ec;">
          <tr><td style="background:${BRAND.ink};padding:24px 32px;">
            <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:.04em;">${BRAND.name}</div>
            <div style="height:3px;width:44px;background:${BRAND.accent};border-radius:2px;margin-top:8px;"></div>
          </td></tr>
          <tr><td style="padding:30px 32px 8px;">
            ${heading ? `<p style="margin:0 0 6px;color:${BRAND.ink};font-size:20px;font-weight:700;">${escapeHtml(heading)}</p>` : ""}
            ${subheading ? `<p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.5;">${escapeHtml(subheading)}</p>` : ""}
          </td></tr>
          <tr><td style="padding:16px 32px 30px;">${bodyHtml}</td></tr>
        </table>
        <p style="max-width:600px;margin:16px auto 0;color:#a0a7b2;font-size:12px;text-align:center;line-height:1.6;">
          ${BRAND.name} · Custom print storefront<br/>
          You're receiving this because you placed an order or created an account with us.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
