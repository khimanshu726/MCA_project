/**
 * GST building blocks: GSTIN validation and the GST state-code table.
 *
 * Shared by the browser and the Node server (like productAvailability.js), so
 * a GSTIN the checkout form accepts is one the server accepts too. Keep it pure.
 */

const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 2-digit state code · 10-char PAN · entity number · "Z" · check character.
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** The check character GSTN computes for the first 14 characters. */
export const gstinCheckCharacter = (first14) => {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = GSTIN_CHARS.indexOf(first14[i]);
    const product = value * (i % 2 === 1 ? 2 : 1);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36];
};

export const normalizeGstin = (value) => String(value ?? "").trim().toUpperCase();

/**
 * Validates a GSTIN's format, state code and check character. Catches the
 * common transcription slip of a letter I for the digit 1 (and O for 0): the
 * check character won't match.
 * @returns {{ valid: boolean, gstin: string, stateCode: string|null, reason: string|null }}
 */
export const validateGstin = (value) => {
  const gstin = normalizeGstin(value);
  if (!GSTIN_PATTERN.test(gstin)) {
    return { valid: false, gstin, stateCode: null, reason: "A GSTIN has 15 characters, like 10ABCDE1234F1Z5." };
  }
  const stateCode = gstin.slice(0, 2);
  if (!GST_STATE_NAMES[stateCode]) {
    return { valid: false, gstin, stateCode: null, reason: `${stateCode} isn't a GST state code.` };
  }
  if (gstinCheckCharacter(gstin.slice(0, 14)) !== gstin[14]) {
    return {
      valid: false,
      gstin,
      stateCode: null,
      reason: "This GSTIN's check digit doesn't match. Check for a letter I typed instead of the digit 1, or O for 0.",
    };
  }
  return { valid: true, gstin, stateCode, reason: null };
};

/** GST state / union-territory codes (as used in GSTINs and place of supply). */
export const GST_STATE_NAMES = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  10: "Bihar",
  11: "Sikkim",
  12: "Arunachal Pradesh",
  13: "Nagaland",
  14: "Manipur",
  15: "Mizoram",
  16: "Tripura",
  17: "Meghalaya",
  18: "Assam",
  19: "West Bengal",
  20: "Jharkhand",
  21: "Odisha",
  22: "Chhattisgarh",
  23: "Madhya Pradesh",
  24: "Gujarat",
  26: "Dadra and Nagar Haveli and Daman and Diu",
  27: "Maharashtra",
  29: "Karnataka",
  30: "Goa",
  31: "Lakshadweep",
  32: "Kerala",
  33: "Tamil Nadu",
  34: "Puducherry",
  35: "Andaman and Nicobar Islands",
  36: "Telangana",
  37: "Andhra Pradesh",
  38: "Ladakh",
  97: "Other Territory",
};

const normalizeStateName = (name) =>
  String(name ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z]/g, "");

// Older and alternate spellings seen in addresses and the pincode lookup.
const STATE_ALIASES = {
  orissa: "21",
  pondicherry: "34",
  uttaranchal: "05",
  nctofdelhi: "07",
  newdelhi: "07",
  damananddiu: "26",
  dadraandnagarhaveli: "26",
  andamanandnicobar: "35",
  jammuandkashmirut: "01",
};

const STATE_CODE_BY_NAME = Object.fromEntries([
  ...Object.entries(GST_STATE_NAMES).map(([code, name]) => [normalizeStateName(name), code]),
  ...Object.entries(STATE_ALIASES),
]);

/** The GST state code for a delivery-address state name, or null if unknown. */
export const stateCodeFromName = (name) => STATE_CODE_BY_NAME[normalizeStateName(name)] || null;

/** GST rates (%) in use after the September 2025 rationalisation, plus legacy slabs. */
export const GST_RATES = [0, 0.25, 1.5, 3, 5, 12, 18, 28, 40];

/**
 * The GST rate for an item under an HSN/SAC row. Some codes have a value-based
 * rate (e.g. garments: one rate up to a price per piece, another above it);
 * `unitPrice` is the item's price per piece.
 */
export const rateForHsn = (hsn, unitPrice) => {
  if (!hsn) return null;
  if (hsn.priceThreshold != null && hsn.rateAboveThreshold != null && Number(unitPrice) > Number(hsn.priceThreshold)) {
    return Number(hsn.rateAboveThreshold);
  }
  return Number(hsn.rate);
};
