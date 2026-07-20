import nodemailer from "nodemailer";
import { appConfig } from "../config.js";
import { claimOrderConfirmationEmail, releaseOrderConfirmationEmailClaim } from "./orderStore.js";

let cachedTransporter = null;

const getTransporter = () => {
  if (!appConfig.smtpHost || !appConfig.smtpUser || !appConfig.smtpPass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: appConfig.smtpHost,
      port: appConfig.smtpPort,
      secure: appConfig.smtpSecure,
      auth: {
        user: appConfig.smtpUser,
        pass: appConfig.smtpPass,
      },
    });
  }

  return cachedTransporter;
};

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Order data lands in HTML — product names come from our catalog, but the
// customer's own customization text and name are free-form. Escape everything
// so a stray `<` or `&` can't break the layout or inject markup.
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return character;
    }
  });

const paymentMethodLabel = (method) => {
  if (!method) return "Online";
  if (method === "cod") return "Cash on Delivery";
  return method.charAt(0).toUpperCase() + method.slice(1);
};

// Normalises the two order shapes into one list: the current multi-item
// `lineItems`, or the legacy single-product summary fields as a one-row
// fallback so older records still render a table.
const resolveLineItems = (order) => {
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

const buildAddressLines = (address = {}) =>
  [
    address.street,
    address.landmark,
    [address.city, address.state].filter(Boolean).join(", "),
    address.pincode,
  ].filter((line) => line && String(line).trim());

/**
 * The customer's "your order is confirmed" email. Pure and exported so the
 * content can be asserted without an SMTP server. Returns both a plain-text
 * body (deliverability, text-only clients) and an HTML body.
 */
export const buildOrderConfirmationEmail = (order) => {
  const items = resolveLineItems(order);
  const addressLines = buildAddressLines(order.address);
  const subject = `Order Confirmed · ${order.orderId} · Elite Empressions`;

  const summaryRows = [
    ["Subtotal", order.subtotal],
    order.discountTotal > 0 ? [`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, -order.discountTotal] : null,
    order.platformFee > 0 ? ["Platform fee", order.platformFee] : null,
    order.taxAmount > 0 ? ["Tax", order.taxAmount] : null,
    ["Shipping", order.shippingCharge > 0 ? order.shippingCharge : "Free"],
  ].filter(Boolean);

  // ---- Plain text ----
  const text = [
    `Hi ${order.customerName},`,
    "",
    `Thanks for your order with Elite Empressions — it's confirmed.`,
    "",
    `Order number: ${order.orderId}`,
    `Payment: ${paymentMethodLabel(order.paymentMethod)} (${order.paymentStatus})`,
    "",
    "Items",
    ...items.map(
      (item) =>
        `  - ${item.name} x${item.quantity} — ${formatINR(item.totalPrice)}` +
        (item.customizationText ? `\n      Note: ${item.customizationText}` : ""),
    ),
    "",
    ...summaryRows.map(([label, value]) => `${label}: ${typeof value === "number" ? formatINR(value) : value}`),
    `Total paid: ${formatINR(order.price)}`,
    "",
    "Delivery address",
    ...addressLines.map((line) => `  ${line}`),
    "",
    "We'll email you again when your order ships.",
    "— Elite Empressions",
  ].join("\n");

  // ---- HTML ----
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #ececec;">
            <div style="color:#16191f;font-weight:600;">${escapeHtml(item.name)}</div>
            ${item.customizationText ? `<div style="color:#828b98;font-size:13px;margin-top:2px;">${escapeHtml(item.customizationText)}</div>` : ""}
            <div style="color:#828b98;font-size:13px;margin-top:2px;">Qty ${escapeHtml(item.quantity)} × ${formatINR(item.unitPrice)}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #ececec;text-align:right;color:#16191f;font-weight:600;white-space:nowrap;vertical-align:top;">${formatINR(item.totalPrice)}</td>
        </tr>`,
    )
    .join("");

  const summaryHtml = summaryRows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:4px 0;color:#5b636f;font-size:14px;">${escapeHtml(label)}</td>
          <td style="padding:4px 0;text-align:right;color:#333a45;font-size:14px;white-space:nowrap;">${typeof value === "number" ? formatINR(value) : escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e8ec;">
          <tr>
            <td style="background:#16191f;padding:26px 32px;">
              <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.02em;">Elite Empressions</div>
              <div style="color:#b7c96b;font-size:13px;margin-top:2px;">Order confirmed</div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 8px;">
              <p style="margin:0 0 6px;color:#16191f;font-size:20px;font-weight:700;">Thanks, ${escapeHtml(order.customerName)}!</p>
              <p style="margin:0;color:#5b636f;font-size:14px;line-height:1.5;">Your order is confirmed and we've started getting it ready. Here's a summary.</p>
              <table role="presentation" width="100%" style="margin-top:20px;background:#f6f7f9;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="color:#828b98;font-size:12px;text-transform:uppercase;letter-spacing:.06em;">Order number</div>
                    <div style="color:#16191f;font-size:16px;font-weight:700;margin-top:2px;">${escapeHtml(order.orderId)}</div>
                  </td>
                  <td style="padding:14px 16px;text-align:right;">
                    <div style="color:#828b98;font-size:12px;text-transform:uppercase;letter-spacing:.06em;">Payment</div>
                    <div style="color:#16191f;font-size:14px;font-weight:600;margin-top:2px;">${escapeHtml(paymentMethodLabel(order.paymentMethod))} · ${escapeHtml(order.paymentStatus)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${summaryHtml}
                <tr>
                  <td style="padding:12px 0 0;border-top:2px solid #16191f;color:#16191f;font-size:16px;font-weight:700;">Total paid</td>
                  <td style="padding:12px 0 0;border-top:2px solid #16191f;text-align:right;color:#16191f;font-size:16px;font-weight:700;white-space:nowrap;">${formatINR(order.price)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              <div style="color:#828b98;font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Delivery address</div>
              <div style="color:#333a45;font-size:14px;line-height:1.6;">
                <div style="color:#16191f;font-weight:600;">${escapeHtml(order.customerName)}</div>
                ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
                ${order.phone ? `<div style="color:#828b98;margin-top:4px;">${escapeHtml(order.phone)}</div>` : ""}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 30px;">
              <p style="margin:0;color:#828b98;font-size:13px;line-height:1.6;">We'll send another email with tracking details as soon as your order ships. Questions? Just reply to this email.</p>
            </td>
          </tr>
        </table>
        <p style="max-width:600px;margin:16px auto 0;color:#a0a7b2;font-size:12px;text-align:center;">Elite Empressions · Custom print storefront</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
};

/** Internal alert to the shop that a new confirmed order came in. */
export const buildAdminOrderAlert = (order) => ({
  subject: `New Order ${order.orderId}`,
  text: [
    `A confirmed order was placed for ${order.productName}.`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Payment: ${paymentMethodLabel(order.paymentMethod)} (${order.paymentStatus})`,
    `Total: ${formatINR(order.price)}`,
  ].join("\n"),
});

/**
 * Sends the customer confirmation (and the admin alert) for an order that is
 * actually confirmed — COD at creation, online once payment is captured.
 *
 * Idempotent by construction: it atomically claims the confirmation before
 * sending, so the payment-captured webhook and the client verify call cannot
 * both dispatch. If SMTP isn't configured it no-ops without claiming, so a
 * later run can still deliver once configured. If the send fails it releases
 * the claim so a webhook retry can try again.
 */
export const notifyOrderConfirmed = async (order) => {
  if (!order?.orderId || !order.email) {
    return { delivered: false, reason: "missing-recipient" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { delivered: false, reason: "smtp-not-configured" };
  }

  const claimed = await claimOrderConfirmationEmail(order.orderId);
  if (!claimed) {
    return { delivered: false, reason: "already-sent" };
  }

  try {
    const confirmation = buildOrderConfirmationEmail(claimed);
    const adminAlert = buildAdminOrderAlert(claimed);

    // Customer confirmation is the one the user asked for; send it first so an
    // admin-alert failure can't cost the customer their receipt.
    await transporter.sendMail({
      from: appConfig.smtpFrom,
      to: claimed.email,
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
    });

    await transporter.sendMail({
      from: appConfig.smtpFrom,
      to: appConfig.adminNotificationEmail,
      subject: adminAlert.subject,
      text: adminAlert.text,
    });

    return { delivered: true };
  } catch (error) {
    await releaseOrderConfirmationEmailClaim(order.orderId).catch(() => {
      // Best-effort: if even the release fails, the confirmation stays marked
      // sent. That is the safe direction — a missed retry beats a duplicate.
    });
    throw error;
  }
};
