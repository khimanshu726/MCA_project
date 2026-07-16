/**
 * Shared text measurement so the interactive stage (DOM) and the print
 * exporter (canvas) wrap text identically. All sizes in millimetres; a
 * fixed internal scale keeps canvas font metrics precise.
 */

const MEASURE_SCALE = 4; // px per mm during measurement

let measureContext = null;

const getContext = () => {
  if (!measureContext) {
    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    measureContext = canvas ? canvas.getContext("2d") : null;
  }
  return measureContext;
};

export const fontShorthand = (layer, pxPerMm) =>
  `${layer.italic ? "italic " : ""}${layer.fontWeight || 400} ${layer.fontSize * pxPerMm}px "${layer.fontFamily}", sans-serif`;

/**
 * Wrap a text layer's content into lines that fit its width. Explicit
 * newlines are respected; words longer than the box overflow on their own
 * line (matching CSS break-word behaviour closely enough for print).
 */
export function wrapTextLayer(layer) {
  const context = getContext();
  const maxWidthPx = layer.width * MEASURE_SCALE;
  // Uppercase transforms happen before measuring so wrap points match the
  // rendered glyph widths.
  const content = layer.uppercase ? layer.text.toUpperCase() : layer.text;

  if (!context) {
    // jsdom without canvas: fall back to explicit line breaks only.
    return content.split("\n");
  }

  context.font = fontShorthand(layer, MEASURE_SCALE);
  const letterSpacingPx = (layer.letterSpacing || 0) * layer.fontSize * MEASURE_SCALE;

  const measure = (text) => context.measureText(text).width + letterSpacingPx * Math.max(0, text.length - 1);

  const lines = [];
  for (const paragraph of content.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate) <= maxWidthPx || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }

    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

/** Auto height (mm) for a text layer given its content, width, and spacing. */
export function measureTextLayerHeight(layer) {
  const lines = wrapTextLayer(layer);
  const lineHeightMm = layer.fontSize * (layer.lineHeight || 1.25);
  return Math.max(lines.length * lineHeightMm, layer.fontSize * 1.1);
}
