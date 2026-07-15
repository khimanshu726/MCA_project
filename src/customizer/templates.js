/**
 * Product template registry.
 *
 * Every customizable product resolves to a template that defines its print
 * geometry in millimetres: the trim box (final cut size), bleed (artwork
 * that extends past the cut), and safe area (keep text/logos inside). All
 * layer coordinates in editor state are millimetres relative to the full
 * canvas (trim + bleed on each side), so one rendering engine serves every
 * product from a visiting card to a 6-foot banner.
 *
 * Templates are keyed by product category with per-product overrides
 * available via PRODUCT_TEMPLATE_OVERRIDES.
 */

export const TEMPLATES = {
  "visiting-cards": {
    id: "visiting-cards",
    label: "Business Card",
    trim: { width: 89, height: 51 },
    bleed: 3,
    safe: 4,
    minDpi: 300,
    recommendedDpi: 300,
    sides: [
      { id: "front", label: "Front" },
      { id: "back", label: "Back" },
    ],
    options: [
      { id: "paper", label: "Paper", values: ["350 GSM Matte", "350 GSM Gloss", "Textured Ivory"] },
      { id: "corners", label: "Corners", values: ["Square", "Rounded"] },
      { id: "finish", label: "Finish", values: ["None", "Spot UV", "Foil Accent"] },
    ],
  },
  "marketing-materials": {
    id: "marketing-materials",
    label: "Flyer (A5)",
    trim: { width: 148, height: 210 },
    bleed: 3,
    safe: 5,
    minDpi: 300,
    recommendedDpi: 300,
    sides: [
      { id: "front", label: "Front" },
      { id: "back", label: "Back" },
    ],
    options: [
      { id: "paper", label: "Paper", values: ["130 GSM Gloss", "170 GSM Gloss", "300 GSM Card"] },
      { id: "fold", label: "Fold", values: ["Flat", "Half Fold", "Tri-Fold"] },
    ],
  },
  banners: {
    id: "banners",
    label: "Banner (6 × 2 ft)",
    trim: { width: 1830, height: 610 },
    bleed: 10,
    safe: 30,
    minDpi: 72,
    recommendedDpi: 100,
    sides: [{ id: "front", label: "Front" }],
    options: [
      { id: "material", label: "Material", values: ["Flex", "Vinyl", "Fabric"] },
      { id: "finishing", label: "Finishing", values: ["Eyelets", "Pole Pockets", "None"] },
    ],
  },
  invitations: {
    id: "invitations",
    label: "Invitation (5 × 7 in)",
    trim: { width: 127, height: 178 },
    bleed: 3,
    safe: 6,
    minDpi: 300,
    recommendedDpi: 300,
    sides: [
      { id: "front", label: "Front" },
      { id: "back", label: "Back" },
    ],
    options: [
      { id: "paper", label: "Paper", values: ["Pearl Shimmer", "Cotton", "Recycled Kraft"] },
      { id: "envelope", label: "Envelope", values: ["Ivory", "Kraft", "None"] },
    ],
  },
  "photo-gifts": {
    id: "photo-gifts",
    label: "Mug Wrap",
    trim: { width: 200, height: 85 },
    bleed: 3,
    safe: 5,
    minDpi: 300,
    recommendedDpi: 300,
    sides: [{ id: "front", label: "Wrap" }],
    options: [
      { id: "handleColor", label: "Handle Colour", values: ["White", "Black", "Red"] },
      { id: "insideColor", label: "Inside Colour", values: ["White", "Black", "Red"] },
      { id: "wrap", label: "Wrap Position", values: ["Full Wrap", "Left of Handle", "Right of Handle"] },
    ],
  },
  stationery: {
    id: "stationery",
    label: "Notebook Cover (A5)",
    trim: { width: 148, height: 210 },
    bleed: 5,
    safe: 8,
    minDpi: 300,
    recommendedDpi: 300,
    sides: [
      { id: "front", label: "Front Cover" },
      { id: "back", label: "Back Cover" },
    ],
    options: [
      { id: "binding", label: "Binding", values: ["Wiro", "Perfect Bound", "Saddle Stitch"] },
      { id: "pages", label: "Pages", values: ["120", "160", "200"] },
      { id: "coverFinish", label: "Cover Finish", values: ["Matte Lamination", "Gloss Lamination", "Soft Touch"] },
    ],
  },
  "clothing-merchandise": {
    id: "clothing-merchandise",
    label: "T-Shirt Print",
    trim: { width: 280, height: 380 },
    bleed: 0,
    safe: 10,
    minDpi: 150,
    recommendedDpi: 200,
    sides: [
      { id: "front", label: "Front Print" },
      { id: "back", label: "Back Print" },
    ],
    options: [
      { id: "size", label: "Size", values: ["S", "M", "L", "XL", "XXL"] },
      { id: "color", label: "Shirt Colour", values: ["White", "Black", "Navy", "Sand"] },
    ],
  },
  "labels-packaging": {
    id: "labels-packaging",
    label: "Mailer Sleeve",
    trim: { width: 250, height: 100 },
    bleed: 3,
    safe: 5,
    minDpi: 300,
    recommendedDpi: 300,
    sides: [{ id: "front", label: "Sleeve" }],
    options: [
      { id: "material", label: "Material", values: ["Kraft", "White Card", "Recycled"] },
      { id: "finish", label: "Finish", values: ["Uncoated", "Matte Lamination"] },
    ],
  },
  // Fallback for any product whose category has no dedicated template.
  "custom-print": {
    id: "custom-print",
    label: "Custom Print (A4)",
    trim: { width: 210, height: 297 },
    bleed: 3,
    safe: 5,
    minDpi: 300,
    recommendedDpi: 300,
    sides: [{ id: "front", label: "Front" }],
    options: [],
  },
};

const CATEGORY_TO_TEMPLATE = {
  "Visiting Cards": "visiting-cards",
  "Marketing Materials": "marketing-materials",
  Banners: "banners",
  Invitations: "invitations",
  "Photo Gifts": "photo-gifts",
  Stationery: "stationery",
  "Clothing & Merchandise": "clothing-merchandise",
  "Labels & Packaging": "labels-packaging",
};

// Per-product overrides win over the category mapping (e.g. a specific
// poster product could point at a dedicated poster template later).
const PRODUCT_TEMPLATE_OVERRIDES = {};

export function getTemplateForProduct(product) {
  if (!product) {
    return TEMPLATES["custom-print"];
  }

  const overrideId = PRODUCT_TEMPLATE_OVERRIDES[product.id];
  if (overrideId && TEMPLATES[overrideId]) {
    return TEMPLATES[overrideId];
  }

  const templateId = CATEGORY_TO_TEMPLATE[product.category];
  return TEMPLATES[templateId] || TEMPLATES["custom-print"];
}

export function getTemplateById(templateId) {
  return TEMPLATES[templateId] || TEMPLATES["custom-print"];
}

/** Full canvas size (trim + bleed on every edge) in millimetres. */
export function getCanvasSize(template) {
  return {
    width: template.trim.width + template.bleed * 2,
    height: template.trim.height + template.bleed * 2,
  };
}

/** Trim rectangle in canvas coordinates (mm). */
export function getTrimRect(template) {
  return {
    x: template.bleed,
    y: template.bleed,
    width: template.trim.width,
    height: template.trim.height,
  };
}

/** Safe-area rectangle in canvas coordinates (mm). */
export function getSafeRect(template) {
  return {
    x: template.bleed + template.safe,
    y: template.bleed + template.safe,
    width: template.trim.width - template.safe * 2,
    height: template.trim.height - template.safe * 2,
  };
}

export function getDefaultOptions(template) {
  const options = {};
  for (const option of template.options) {
    options[option.id] = option.values[0];
  }
  return options;
}
