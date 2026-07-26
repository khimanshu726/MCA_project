import { BRAND, button, escapeHtml, renderLayout } from "./layout.js";

/**
 * Branded email-verification email (Option B). The `link` is a Firebase
 * verification link generated server-side (firebaseAdmin.buildEmailVerificationLink);
 * clicking it lands the customer on /auth/action to confirm the address.
 */
export const emailVerification = (email, link) => {
  const safeLink = escapeHtml(link);
  return {
    subject: "Verify your email for Elite Impressions",
    html: renderLayout({
      heading: "Confirm your email address",
      subheading: `For ${email}`,
      preheader: "Confirm your email to finish setting up your Elite Impressions account.",
      bodyHtml: `
        <p style="margin:0 0 16px;color:${BRAND.text};font-size:14px;line-height:1.6;">
          Confirm this is your email address to finish setting up your Elite Impressions
          account, then you can check out and manage your orders.
        </p>
        ${button("Verify my email", link)}
        <p style="margin:16px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">
          This link can be used once. If the button doesn't work, copy and paste this address
          into your browser:<br/>
          <a href="${safeLink}" style="color:${BRAND.accent};word-break:break-all;">${safeLink}</a>
        </p>
        <p style="margin:16px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">
          If you didn't create an account, you can safely ignore this email.
        </p>`,
    }),
    text: [
      "Confirm your Elite Impressions email address",
      "",
      `Confirm ${email} to finish setting up your account.`,
      "",
      "Verify here (single use):",
      link,
      "",
      "If you didn't create an account, ignore this email.",
    ].join("\n"),
  };
};
