import { HsnCode } from "../models/HsnCode.js";

/**
 * Starting HSN/SAC rows for the shop's product range — SUGGESTIONS, every one
 * unconfirmed. They were compiled from secondary sources after the September
 * 2025 GST rate rationalisation (Notification 09/2025-CT(R)), and those sources
 * disagree on some print items. GST is never charged on an unconfirmed row:
 * the owner or their accountant reviews each in the admin "HSN & GST rates"
 * screen, corrects it if needed, and confirms it.
 */
export const SUGGESTED_HSN_CODES = [
  {
    code: "998912",
    kind: "SAC",
    description: "Printing services on the customer's own content (visiting cards, flyers, banners, question papers, answer booklets)",
    rate: 18,
    notes: "Accountant to decide: printing on a customer's content may be a service (SAC 998912) or goods (HSN 4911). Both are listed at 18% in current sources.",
  },
  {
    code: "4911",
    kind: "HSN",
    description: "Other printed matter, incl. commercial printing (goods)",
    rate: 18,
    notes: "Alternative to SAC 998912 for printed items; use one consistently.",
  },
  {
    code: "48201010",
    kind: "HSN",
    description: "Registers and account books (general, attendance, service books)",
    rate: 18,
    notes: "Confirm the exact 8-digit code.",
  },
  {
    code: "48202000",
    kind: "HSN",
    description: "Exercise books and notebooks",
    rate: 0,
    notes: "Listed as Nil from 22 Sep 2025 (was 12%). Confirm.",
  },
  {
    code: "4909",
    kind: "HSN",
    description: "Printed cards: wedding invitations, greeting cards",
    rate: 18,
    notes: "Sources conflict (5% vs 18%). Must be confirmed before use.",
  },
  {
    code: "6912",
    kind: "HSN",
    description: "Ceramic tableware: printed mugs",
    rate: 18,
    notes: "Rate not verified. Confirm.",
  },
  {
    code: "6109",
    kind: "HSN",
    description: "T-shirts, knitted or crocheted",
    rate: 5,
    priceThreshold: 2500,
    rateAboveThreshold: 18,
    notes: "Value-based: listed as 5% up to ₹2,500 per piece, 18% above. Confirm.",
  },
  {
    code: "4819",
    kind: "HSN",
    description: "Cartons, boxes and packaging of paper or paperboard",
    rate: 18,
    notes: "Rate not verified; some packaging codes moved in Sep 2025. Confirm.",
  },
  {
    code: "996812",
    kind: "SAC",
    description: "Delivery / courier charges (shipping fee on orders)",
    rate: 18,
    appliesTo: "shipping",
    notes: "Accountant to confirm: shipping charged with goods is often taxed at the main item's rate instead.",
  },
  {
    code: "998599",
    kind: "SAC",
    description: "Platform / handling fee on orders",
    rate: 18,
    appliesTo: "platformFee",
    notes: "Accountant to confirm the code and rate for the per-order platform fee.",
  },
];

// Seeds only an empty collection, like ensureCouponsSeeded, so codes and rates
// the owner has edited or confirmed are never overwritten.
export const ensureHsnCodesSeeded = async () => {
  const existingCount = await HsnCode.countDocuments();
  if (existingCount > 0) {
    return { seeded: false };
  }
  await HsnCode.insertMany(SUGGESTED_HSN_CODES.map((row) => ({ ...row, confirmed: false })));
  return { seeded: true, count: SUGGESTED_HSN_CODES.length };
};
