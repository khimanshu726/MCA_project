import { getCanvasSize } from "../templates.js";
import { mmToPx } from "./geometry.js";
import { fontShorthand, wrapTextLayer } from "./textMetrics.js";

/**
 * Print rendering: replays the exact layer model the DOM stage displays
 * onto an offscreen canvas at print resolution. Nothing is ever merged in
 * the editor itself — this is the only place the design flattens, and it
 * runs at add-to-cart/export time.
 */

// Long-edge cap keeps banner exports inside canvas memory limits; the
// effective DPI achieved is returned so callers can surface it honestly.
const MAX_EXPORT_EDGE_PX = 4000;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("An image layer failed to load for export."));
    image.src = src;
  });

const drawBackground = (ctx, background, width, height) => {
  if (background?.type === "gradient") {
    const angle = ((background.angle ?? 135) * Math.PI) / 180;
    const half = Math.max(width, height);
    const cx = width / 2;
    const cy = height / 2;
    const dx = Math.sin(angle) * half;
    const dy = -Math.cos(angle) * half;
    const gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    gradient.addColorStop(0, background.value);
    gradient.addColorStop(1, background.value2 ?? background.value);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = background?.value || "#ffffff";
  }
  ctx.fillRect(0, 0, width, height);
};

const drawImageLayer = async (ctx, layer, pxPerMm) => {
  const image = await loadImage(layer.src);
  const crop = layer.crop || { x: 0, y: 0, width: 1, height: 1 };

  const destW = layer.width * pxPerMm;
  const destH = layer.height * pxPerMm;

  const filters = layer.filters || {};
  ctx.filter = `brightness(${(filters.brightness ?? 100) / 100}) contrast(${(filters.contrast ?? 100) / 100}) saturate(${(filters.saturation ?? 100) / 100})`;
  ctx.scale(layer.flipH ? -1 : 1, layer.flipV ? -1 : 1);

  ctx.drawImage(
    image,
    crop.x * image.naturalWidth,
    crop.y * image.naturalHeight,
    crop.width * image.naturalWidth,
    crop.height * image.naturalHeight,
    -destW / 2,
    -destH / 2,
    destW,
    destH,
  );
};

const drawTextLayer = (ctx, layer, pxPerMm) => {
  const lines = wrapTextLayer(layer);
  const fontSizePx = layer.fontSize * pxPerMm;
  const lineHeightPx = fontSizePx * (layer.lineHeight || 1.25);
  const boxW = layer.width * pxPerMm;
  const boxH = layer.height * pxPerMm;

  ctx.font = fontShorthand(layer, pxPerMm);
  ctx.textBaseline = "middle";
  ctx.textAlign = layer.align || "center";
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = `${(layer.letterSpacing || 0) * fontSizePx}px`;
  }

  let fillStyle = layer.color;
  if (layer.gradient) {
    const gradient = ctx.createLinearGradient(-boxW / 2, 0, boxW / 2, 0);
    gradient.addColorStop(0, layer.gradient.from);
    gradient.addColorStop(1, layer.gradient.to);
    fillStyle = gradient;
  }

  if (layer.shadow) {
    ctx.shadowColor = layer.shadow.color;
    ctx.shadowOffsetX = layer.shadow.x * pxPerMm;
    ctx.shadowOffsetY = layer.shadow.y * pxPerMm;
    ctx.shadowBlur = layer.shadow.blur * pxPerMm;
  }

  const originX = layer.align === "left" ? -boxW / 2 : layer.align === "right" ? boxW / 2 : 0;
  // The DOM stage top-aligns text within its box (normal block flow), and
  // the box height auto-fits content, so render from the box top.
  const startY = -boxH / 2 + lineHeightPx / 2;

  lines.forEach((line, index) => {
    const y = startY + index * lineHeightPx;

    ctx.fillStyle = fillStyle;
    ctx.fillText(line, originX, y);

    if (layer.strokeWidth > 0) {
      ctx.lineWidth = layer.strokeWidth * pxPerMm;
      ctx.strokeStyle = layer.strokeColor;
      ctx.strokeText(line, originX, y);
    }

    if (layer.underline && line) {
      const metrics = ctx.measureText(line);
      const lineY = y + fontSizePx * 0.42;
      let startX = originX;
      if (ctx.textAlign === "center") {
        startX = originX - metrics.width / 2;
      } else if (ctx.textAlign === "right") {
        startX = originX - metrics.width;
      }
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.fillRect(startX, lineY, metrics.width, Math.max(1, fontSizePx * 0.06));
      ctx.restore();
    }
  });
};

/** Render one side of the design to a canvas at the requested resolution. */
export async function renderSideToCanvas(design, sideId, template, { dpi }) {
  const canvasMm = getCanvasSize(template);

  let pxPerMm = mmToPx(1, dpi);
  const longEdgePx = Math.max(canvasMm.width, canvasMm.height) * pxPerMm;
  if (longEdgePx > MAX_EXPORT_EDGE_PX) {
    pxPerMm *= MAX_EXPORT_EDGE_PX / longEdgePx;
  }

  const widthPx = Math.round(canvasMm.width * pxPerMm);
  const heightPx = Math.round(canvasMm.height * pxPerMm);

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");

  const side = design.sides[sideId];
  drawBackground(ctx, side.background, widthPx, heightPx);

  for (const layer of side.layers) {
    if (layer.hidden) {
      continue;
    }

    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.translate(layer.x * pxPerMm, layer.y * pxPerMm);
    ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);

    try {
      if (layer.type === "image") {
        // eslint-disable-next-line no-await-in-loop
        await drawImageLayer(ctx, layer, pxPerMm);
      } else if (layer.type === "text") {
        drawTextLayer(ctx, layer, pxPerMm);
      }
    } finally {
      ctx.restore();
    }
  }

  return { canvas, widthPx, heightPx, effectiveDpi: Math.round((pxPerMm * 25.4) / 1) };
}

const canvasToDataUrl = (canvas, type, quality) => canvas.toDataURL(type, quality);

/** Print-ready output for every side, plus a preview and thumbnail. */
export async function exportDesign(design, template) {
  const sideIds = Object.keys(design.sides);
  const printFiles = [];

  for (const sideId of sideIds) {
    // eslint-disable-next-line no-await-in-loop
    const { canvas, widthPx, heightPx, effectiveDpi } = await renderSideToCanvas(design, sideId, template, {
      dpi: template.recommendedDpi,
    });

    let dataUrl = canvasToDataUrl(canvas, "image/png");
    // Keep the handoff payload storable: large canvases fall back to JPEG.
    if (dataUrl.length > 4 * 1024 * 1024) {
      dataUrl = canvasToDataUrl(canvas, "image/jpeg", 0.92);
    }

    printFiles.push({ sideId, dataUrl, widthPx, heightPx, dpi: effectiveDpi });
  }

  const firstSideId = sideIds[0];
  const { canvas: previewCanvas } = await renderSideToCanvas(design, firstSideId, template, { dpi: 40 });
  const previewDataUrl = canvasToDataUrl(previewCanvas, "image/jpeg", 0.85);

  return { printFiles, previewDataUrl };
}

export function dataUrlToFile(dataUrl, fileName) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}
