import { BRAND, button, escapeHtml, renderLayout } from "./layout.js";

/**
 * Branded password-reset email (Option B). The `link` is a Firebase reset link
 * generated server-side (see firebaseAdmin.buildPasswordResetLink); redeeming
 * it lands the customer on /auth/action.
 */
export const passwordReset = (email, link) => {
  const safeLink = escapeHtml(link);
  return {
    subject: "Reset your Elite Impressions password",
    html: renderLayout({
      heading: "Reset your password",
      subheading: `Requested for ${email}`,
      preheader: "Use this link to set a new Elite Impressions password. It expires in about an hour.",
      bodyHtml: `
        <p style="margin:0 0 16px;color:${BRAND.text};font-size:14px;line-height:1.6;">
          We received a request to reset the password for <strong>${escapeHtml(email)}</strong>.
          Choose a new password using the button below.
        </p>
        ${button("Reset my password", link)}
        <p style="margin:16px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">
          This link expires in about an hour and can be used once. If the button doesn't work,
          copy and paste this address into your browser:<br/>
          <a href="${safeLink}" style="color:${BRAND.accent};word-break:break-all;">${safeLink}</a>
        </p>
        <p style="margin:16px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>`,
    }),
    text: [
      "Reset your Elite Impressions password",
      "",
      `We received a request to reset the password for ${email}.`,
      "",
      "Reset it here (expires in about an hour, single use):",
      link,
      "",
      "If you didn't request this, ignore this email — your password won't change.",
    ].join("\n"),
  };
};
