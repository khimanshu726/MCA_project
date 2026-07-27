import { BRAND, escapeHtml, renderLayout } from "./layout.js";

/**
 * One-time sign-in code for the admin panel (email OTP).
 */
export const loginOtp = (email, code) => ({
  subject: "Your Elite Impressions admin sign-in code",
  html: renderLayout({
    heading: "Your admin sign-in code",
    subheading: `For ${email}`,
    preheader: "Use this one-time code to sign in — it expires in 5 minutes.",
    bodyHtml: `
      <p style="margin:0 0 16px;color:${BRAND.text};font-size:14px;line-height:1.6;">
        Use this one-time code to sign in to the Elite Impressions admin panel:
      </p>
      <div style="margin:8px 0 18px;font-size:30px;font-weight:700;letter-spacing:8px;color:${BRAND.ink};font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${escapeHtml(code)}</div>
      <p style="margin:0;color:${BRAND.muted};font-size:13px;line-height:1.6;">
        It expires in 5 minutes and can be used once. If you didn't request this code, you can safely
        ignore this email — no one can sign in without it.
      </p>`,
  }),
  text: [
    "Your Elite Impressions admin sign-in code",
    "",
    `Code: ${code}`,
    "",
    "It expires in 5 minutes and can be used once.",
    "If you didn't request this, ignore this email.",
  ].join("\n"),
});
