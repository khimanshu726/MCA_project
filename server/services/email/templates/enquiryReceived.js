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

  const items = Array.isArray(enquiry.items) ? enquiry.items : [];
  const itemsHtml = items.length
    ? `
    <div style="margin:0 0 16px;">
      ${sectionLabel("Configured items")}
      <table role="presentation" width="100%" style="margin:6px 0 0;border-collapse:collapse;">
        ${items
          .map((item) => {
            const spec = (item.options || [])
              .map((option) => `${escapeHtml(option.label)}: ${escapeHtml(option.value)}`)
              .join(" · ");
            return `
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid ${BRAND.surface};color:${BRAND.ink};font-size:14px;">
            <strong>${escapeHtml(item.productName)}</strong>${spec ? `<span style="color:${BRAND.muted};"> — ${spec}</span>` : ""}
          </td>
          <td style="padding:6px 0;border-bottom:1px solid ${BRAND.surface};color:${BRAND.ink};font-size:14px;text-align:right;white-space:nowrap;">Qty ${escapeHtml(String(item.quantity ?? 1))}</td>
        </tr>`;
          })
          .join("")}
      </table>
    </div>`
    : "";

  const sampleHtml = enquiry.sampleUrl
    ? `<div style="margin:0 0 16px;">${sectionLabel("Sample")}<p style="margin:6px 0 0;font-size:14px;"><a href="${escapeHtml(enquiry.sampleUrl)}" style="color:${BRAND.accent || BRAND.ink};font-weight:600;">${escapeHtml(enquiry.sampleName || "View attached sample")}</a></p></div>`
    : "";

  const bodyHtml = `
    <table role="presentation" width="100%" style="margin:4px 0 20px;background:${BRAND.surface};border-radius:10px;">
      ${rowsHtml}
    </table>
    ${itemsHtml}
    <div style="margin:0 0 16px;">
      ${sectionLabel("Requirements")}
      <p style="margin:6px 0 0;color:${BRAND.ink};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(enquiry.requirements)}</p>
    </div>
    ${sampleHtml}
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
      ...(items.length
        ? [
            "",
            "Configured items:",
            ...items.map((item) => {
              const spec = (item.options || []).map((option) => `${option.label}: ${option.value}`).join(", ");
              return `- ${item.productName}${spec ? ` (${spec})` : ""} × ${item.quantity ?? 1}`;
            }),
          ]
        : []),
      "",
      "Requirements:",
      enquiry.requirements,
      ...(enquiry.sampleUrl ? ["", `Sample: ${enquiry.sampleName || "attached"} — ${enquiry.sampleUrl}`] : []),
      ...(enquiry.message ? ["", "Message:", enquiry.message] : []),
    ].join("\n"),
  };
};
