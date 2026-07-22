import { BRAND, STOREFRONT_URL, button, escapeHtml, renderLayout } from "./layout.js";

/** Welcome email sent once when a customer first registers. */
export const welcomeEmail = (user) => {
  const name = (user.username || "").trim() || "there";
  const bodyHtml = `
    <p style="margin:0 0 16px;color:${BRAND.text};font-size:14px;line-height:1.6;">
      Welcome to ${BRAND.name} — your account is ready. Design custom prints, save your delivery details, and reorder in a couple of taps.
    </p>
    <ul style="margin:0 0 16px;padding-left:18px;color:${BRAND.text};font-size:14px;line-height:1.8;">
      <li>Business cards, flyers, banners, packaging, merch and more</li>
      <li>A built-in design studio to customise every product</li>
      <li>Saved addresses and order history for faster checkout</li>
    </ul>
    ${button("Explore products", `${STOREFRONT_URL}/products`)}
    <p style="margin:18px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">Happy printing! Reply any time if you need a hand.</p>
  `;
  return {
    subject: `Welcome to ${BRAND.name}`,
    html: renderLayout({
      heading: `Welcome, ${name}!`,
      subheading: "Your Elite Impressions account is ready.",
      preheader: "Welcome to Elite Impressions — start designing your prints.",
      bodyHtml,
    }),
    text: [
      `Hi ${name},`,
      "",
      `Welcome to ${BRAND.name} — your account is ready.`,
      "Design custom prints, save your delivery details, and reorder in a couple of taps.",
      "",
      `Explore products: ${STOREFRONT_URL}/products`,
      "— Elite Impressions",
    ].join("\n"),
  };
};
