/**
 * Curated font list for text layers. Inter, Fraunces, Poppins, and
 * Playfair Display are Google Fonts loaded by the site (index.html); the
 * rest are cross-platform system faces so on-screen text and the canvas
 * print render never silently diverge from a missing font file.
 */
export const FONT_OPTIONS = [
  { value: "Inter", label: "Inter", stack: '"Inter", sans-serif' },
  { value: "Fraunces", label: "Fraunces", stack: '"Fraunces", serif' },
  { value: "Poppins", label: "Poppins", stack: '"Poppins", sans-serif' },
  { value: "Playfair Display", label: "Playfair Display", stack: '"Playfair Display", serif' },
  { value: "Georgia", label: "Georgia", stack: "Georgia, serif" },
  { value: "Times New Roman", label: "Times New Roman", stack: '"Times New Roman", serif' },
  { value: "Arial", label: "Arial", stack: "Arial, sans-serif" },
  { value: "Verdana", label: "Verdana", stack: "Verdana, sans-serif" },
  { value: "Trebuchet MS", label: "Trebuchet MS", stack: '"Trebuchet MS", sans-serif' },
  { value: "Courier New", label: "Courier New", stack: '"Courier New", monospace' },
];

export const TEXT_COLOR_SWATCHES = [
  "#17181b",
  "#ffffff",
  "#b8461d",
  "#953613",
  "#b58a34",
  "#4b6b5b",
  "#2a3b8f",
  "#8f2a5f",
];

export const BACKGROUND_SWATCHES = [
  "#ffffff",
  "#faf8f4",
  "#f3efe7",
  "#17181b",
  "#b8461d",
  "#4b6b5b",
  "#b58a34",
  "#dce4f2",
];

export const GRADIENT_PRESETS = [
  { label: "Ember", value: "#b8461d", value2: "#b58a34", angle: 135 },
  { label: "Forest", value: "#4b6b5b", value2: "#17181b", angle: 135 },
  { label: "Dawn", value: "#f4e1d6", value2: "#c86b3f", angle: 180 },
  { label: "Slate", value: "#2a2b30", value2: "#55575e", angle: 135 },
];
