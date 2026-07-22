import { Resend } from "resend";
import { appConfig } from "../../config.js";
import {
  claimOrderConfirmationEmail,
  releaseOrderConfirmationEmailClaim,
} from "../orderStore.js";
import { orderConfirmation } from "./templates/orderConfirmation.js";
import { paymentSuccess } from "./templates/paymentSuccess.js";
import { paymentFailed } from "./templates/paymentFailed.js";
import { orderShipped } from "./templates/orderShipped.js";
import { orderDelivered } from "./templates/orderDelivered.js";
import { welcomeEmail } from "./templates/welcomeEmail.js";
import { adminNewOrder } from "./templates/adminNewOrder.js";

/**
 * Resend-backed transactional email. Every send goes through sendEmail(), which
 * NEVER throws — email is best-effort and must not fail checkout. The named
 * senders below build a template and dispatch; the orchestrators add the
 * idempotency (atomic claim) that stops duplicate order confirmations.
 */

const resendClient = appConfig.resendApiKey ? new Resend(appConfig.resendApiKey) : null;
const FROM = appConfig.emailFrom;
const ADMIN_TO = appConfig.adminNotificationEmail;

// One-time boot warnings so a misconfigured deploy is visible in logs rather
// than silently dropping mail.
if (!resendClient) {
  console.warn("[email] RESEND_API_KEY is not set — transactional emails are DISABLED (no-op).");
}
if (appConfig.emailFromIsDefault) {
  console.warn(`[email] EMAIL_FROM not set — using default "${FROM}". Set EMAIL_FROM to a Resend-verified address.`);
}
if (appConfig.adminEmailIsDefault) {
  console.warn(`[email] ADMIN_EMAIL not set — admin notifications go to default "${ADMIN_TO}".`);
}

const logEmail = (status, meta) => {
  const line = `[email] ${status} template=${meta.template || "-"} to=${meta.to || "-"}${meta.id ? ` id=${meta.id}` : ""} at=${new Date().toISOString()}`;
  if (status === "failed") console.error(line, meta.error || "");
  else console.log(line);
};

/**
 * Low-level send. Returns a result object, never throws. Skips cleanly when the
 * API key or recipient is missing.
 */
export const sendEmail = async ({ to, subject, html, text, template }) => {
  if (!resendClient) {
    logEmail("skipped", { template, to, error: "no RESEND_API_KEY" });
    return { sent: false, skipped: true, reason: "email-disabled" };
  }
  if (!to) {
    logEmail("skipped", { template, to: "-", error: "no recipient" });
    return { sent: false, skipped: true, reason: "no-recipient" };
  }

  logEmail("queued", { template, to });
  try {
    const { data, error } = await resendClient.emails.send({ from: FROM, to, subject, html, text });
    if (error) {
      logEmail("failed", { template, to, error });
      return { sent: false, error };
    }
    logEmail("sent", { template, to, id: data?.id });
    return { sent: true, id: data?.id };
  } catch (error) {
    // Network/SDK failure — swallow so callers (checkout, webhooks) never break.
    logEmail("failed", { template, to, error: error?.message || error });
    return { sent: false, error: error?.message || String(error) };
  }
};

// ── Named senders (Step 7) ─────────────────────────────────────────────────

export const sendOrderConfirmation = (order) => {
  const { subject, html, text } = orderConfirmation(order);
  return sendEmail({ to: order.email, subject, html, text, template: "orderConfirmation" });
};

export const sendPaymentSuccess = (order, payment) => {
  const { subject, html, text } = paymentSuccess(order, payment);
  return sendEmail({ to: order.email, subject, html, text, template: "paymentSuccess" });
};

export const sendPaymentFailed = (order, options) => {
  const { subject, html, text } = paymentFailed(order, options);
  return sendEmail({ to: order.email, subject, html, text, template: "paymentFailed" });
};

export const sendShipmentEmail = (order) => {
  const { subject, html, text } = orderShipped(order);
  return sendEmail({ to: order.email, subject, html, text, template: "orderShipped" });
};

export const sendDeliveryEmail = (order) => {
  const { subject, html, text } = orderDelivered(order);
  return sendEmail({ to: order.email, subject, html, text, template: "orderDelivered" });
};

export const sendWelcomeEmail = (user) => {
  const { subject, html, text } = welcomeEmail(user);
  return sendEmail({ to: user.email, subject, html, text, template: "welcomeEmail" });
};

export const sendAdminOrderEmail = (order) => {
  const { subject, html, text } = adminNewOrder(order);
  return sendEmail({ to: ADMIN_TO, subject, html, text, template: "adminNewOrder" });
};

// ── Orchestrators with idempotency ─────────────────────────────────────────

/**
 * Sends the customer confirmation + admin alert for a confirmed order, exactly
 * once. recordPaymentCaptured runs from both the payment.captured webhook and
 * the client verify call, so the send is claimed atomically via the order's
 * confirmationEmailSentAt flag — only one caller dispatches. If email is
 * disabled it no-ops without claiming (a later run can still deliver); if the
 * customer send fails it releases the claim so a retry can re-deliver.
 */
export const notifyOrderConfirmed = async (order) => {
  if (!order?.orderId || !order.email) {
    return { delivered: false, reason: "missing-recipient" };
  }
  if (!resendClient) {
    return { delivered: false, reason: "email-disabled" };
  }

  const claimed = await claimOrderConfirmationEmail(order.orderId);
  if (!claimed) {
    return { delivered: false, reason: "already-sent" };
  }

  const result = await sendOrderConfirmation(claimed);
  if (!result.sent) {
    // Re-open the claim so a webhook retry / verify re-run can try again.
    await releaseOrderConfirmationEmailClaim(order.orderId).catch(() => {});
    return { delivered: false, reason: "send-failed", error: result.error };
  }
  // Admin alert is secondary — its failure doesn't cost the customer's receipt
  // and doesn't re-open the claim.
  await sendAdminOrderEmail(claimed);
  return { delivered: true };
};
