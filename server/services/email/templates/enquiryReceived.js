import { BRAND, escapeHtml, renderLayout, sectionLabel } from "./layout.js";

/** Internal alert to the shop when an institution requests a bulk quote. */
export const enquiryReceived = (enquiry) => {
  const rows = [
    ["Institution", enquiry.institutionName],
    ["Type", enquiry.institutionType],
    ["Contact", enquiry.contactName],
    ["Email", enquiry.email],
    ["Phone", enquiry.phone || "—"],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 16px;color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:6px 16px;color:${BRAND.ink};font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");

  const bodyHtml = `
    <table role="presentation" width="100%" style="margin:4px 0 20px;background:${BRAND.surface};border-radius:10px;">
      ${rowsHtml}
    </table>
    <div style="margin:0 0 16px;">
      ${sectionLabel("Requirements")}
      <p style="margin:6px 0 0;color:${BRAND.ink};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(enquiry.requirements)}</p>
    </div>
    ${
      enquiry.message
        ? `<div style="margin:0 0 8px;">${sectionLabel("Message")}<p style="margin:6px 0 0;color:${BRAND.ink};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(enquiry.message)}</p></div>`
        : ""
    }
  `;

  return {
    subject: `New institutional quote request — ${enquiry.institutionName}`,
    html: renderLayout({
      heading: "New bulk quote request",
      subheading: enquiry.institutionName,
      bodyHtml,
      preheader: `${enquiry.contactName} · ${enquiry.email}`,
    }),
    text: [
      "New institutional quote request",
      `Institution: ${enquiry.institutionName}`,
      `Type: ${enquiry.institutionType}`,
      `Contact: ${enquiry.contactName}`,
      `Email: ${enquiry.email}`,
      `Phone: ${enquiry.phone || "—"}`,
      "",
      "Requirements:",
      enquiry.requirements,
      ...(enquiry.message ? ["", "Message:", enquiry.message] : []),
    ].join("\n"),
  };
};
