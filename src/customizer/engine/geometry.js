/**
 * Pure geometry for the design studio. Everything operates in template
 * millimetres; components convert to screen pixels only at render time, so
 * this math is shared by the interactive stage and the print exporter.
 */

export const MM_PER_INCH = 25.4;

/**
 * CSS pixels per millimetre at 100% — i.e. the scale at which the artboard
 * is displayed at its true physical size (CSS defines 1in = 96px).
 *
 * The studio's `scale` is px-per-mm, which is NOT a percentage. Reporting
 * it as one made a business card read "935%" and a banner "48%" — numbers
 * that describe nothing a customer can act on. Zoom percentages are
 * computed against this constant so 100% means "actual printed size".
 */
export const CSS_PX_PER_MM = 96 / MM_PER_INCH;

/** Convert an internal px-per-mm scale to a human zoom percentage. */
export const scaleToZoomPercent = (scale) => Math.round((scale / CSS_PX_PER_MM) * 100);

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const degToRad = (deg) => (deg * Math.PI) / 180;

export const mmToInches = (mm) => mm / MM_PER_INCH;

export const mmToPx = (mm, dpi) => (mm / MM_PER_INCH) * dpi;

/**
 * Effective print resolution of an image layer, accounting for crop: the
 * visible source pixels divided by the printed size in inches. The lower
 * axis wins because that's the one that will look soft.
 */
export function effectiveDpi(layer) {
  if (layer.type !== "image" || !layer.naturalWidth || !layer.naturalHeight) {
    return null;
  }

  const crop = layer.crop || { x: 0, y: 0, width: 1, height: 1 };
  const visiblePxX = layer.naturalWidth * crop.width;
  const visiblePxY = layer.naturalHeight * crop.height;

  const printedInchesX = mmToInches(layer.width);
  const printedInchesY = mmToInches(layer.height);

  if (printedInchesX <= 0 || printedInchesY <= 0) {
    return null;
  }

  return Math.round(Math.min(visiblePxX / printedInchesX, visiblePxY / printedInchesY));
}

export function qualityLevel(dpi, template) {
  if (dpi === null) {
    return "unknown";
  }
  if (dpi < template.minDpi) {
    return "poor";
  }
  if (dpi < template.recommendedDpi) {
    return "fair";
  }
  return "good";
}

/** Rotate a point around a center. Angle in degrees. */
export function rotatePoint(point, center, deg) {
  const rad = degToRad(deg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** Axis-aligned corners of a (possibly rotated) layer, in canvas mm. */
export function layerCorners(layer) {
  const halfW = layer.width / 2;
  const halfH = layer.height / 2;
  const center = { x: layer.x, y: layer.y };

  return [
    { x: layer.x - halfW, y: layer.y - halfH },
    { x: layer.x + halfW, y: layer.y - halfH },
    { x: layer.x + halfW, y: layer.y + halfH },
    { x: layer.x - halfW, y: layer.y + halfH },
  ].map((corner) => rotatePoint(corner, center, layer.rotation || 0));
}

export const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_VECTORS = {
  nw: { x: -1, y: -1 },
  n: { x: 0, y: -1 },
  ne: { x: 1, y: -1 },
  e: { x: 1, y: 0 },
  se: { x: 1, y: 1 },
  s: { x: 0, y: 1 },
  sw: { x: -1, y: 1 },
  w: { x: -1, y: 0 },
};

const MIN_LAYER_MM = 2;

/**
 * Resize a layer from a drag on `handle` to `pointer` (canvas mm),
 * respecting rotation by working in the layer's local space. The opposite
 * handle stays anchored, matching every mainstream editor.
 */
export function resizeLayer(layer, handle, pointer, { keepAspect = false } = {}) {
  const vector = HANDLE_VECTORS[handle];
  if (!vector) {
    return layer;
  }

  const rotation = layer.rotation || 0;
  const center = { x: layer.x, y: layer.y };

  // Anchor = opposite handle, fixed in canvas space.
  const anchorLocal = {
    x: -vector.x * (layer.width / 2),
    y: -vector.y * (layer.height / 2),
  };
  const anchorWorld = rotatePoint({ x: center.x + anchorLocal.x, y: center.y + anchorLocal.y }, center, rotation);

  // Pointer into layer-local space relative to the anchor.
  const pointerLocal = rotatePoint(pointer, anchorWorld, -rotation);
  const deltaX = pointerLocal.x - anchorWorld.x;
  const deltaY = pointerLocal.y - anchorWorld.y;

  let newWidth = vector.x !== 0 ? Math.abs(deltaX) : layer.width;
  let newHeight = vector.y !== 0 ? Math.abs(deltaY) : layer.height;

  const aspect = layer.width / layer.height;
  const lockAspect = keepAspect || (vector.x !== 0 && vector.y !== 0 && layer.aspectLocked !== false);

  if (lockAspect) {
    if (vector.x !== 0 && vector.y !== 0) {
      if (newWidth / aspect >= newHeight) {
        newHeight = newWidth / aspect;
      } else {
        newWidth = newHeight * aspect;
      }
    } else if (vector.x !== 0) {
      newHeight = newWidth / aspect;
    } else {
      newWidth = newHeight * aspect;
    }
  }

  newWidth = Math.max(newWidth, MIN_LAYER_MM);
  newHeight = Math.max(newHeight, MIN_LAYER_MM);

  // New center: anchor plus half the new size in the drag direction
  // (in local space), rotated back to canvas space.
  const dirX = vector.x !== 0 ? Math.sign(deltaX) || vector.x : 0;
  const dirY = vector.y !== 0 ? Math.sign(deltaY) || vector.y : 0;

  const centerLocal = {
    x: anchorWorld.x + (dirX * newWidth) / 2 + (vector.x === 0 ? 0 : 0),
    y: anchorWorld.y + (dirY * newHeight) / 2 + (vector.y === 0 ? 0 : 0),
  };

  // Edge handles keep the perpendicular axis centred on the anchor line.
  if (vector.x === 0) {
    const local = rotatePoint({ x: layer.x, y: layer.y }, anchorWorld, -rotation);
    centerLocal.x = local.x;
  }
  if (vector.y === 0) {
    const local = rotatePoint({ x: layer.x, y: layer.y }, anchorWorld, -rotation);
    centerLocal.y = local.y;
  }

  const newCenter = rotatePoint(centerLocal, anchorWorld, rotation);

  return {
    ...layer,
    x: newCenter.x,
    y: newCenter.y,
    width: newWidth,
    height: newHeight,
  };
}

/** Angle (deg) of the pointer around the layer center, for rotate drags. */
export function rotationFromPointer(layer, pointer) {
  const angle = (Math.atan2(pointer.y - layer.y, pointer.x - layer.x) * 180) / Math.PI + 90;
  return ((angle % 360) + 360) % 360;
}

export const ROTATION_SNAP_DEG = 5;
export const ROTATION_SNAP_TARGETS = [0, 45, 90, 135, 180, 225, 270, 315, 360];

export function snapRotation(deg) {
  for (const target of ROTATION_SNAP_TARGETS) {
    if (Math.abs(deg - target) <= ROTATION_SNAP_DEG) {
      return target % 360;
    }
  }
  return deg;
}

/**
 * Snap a proposed layer center to canvas center / trim edges / safe edges.
 * Returns the snapped center plus the guide lines to draw. Threshold is in
 * mm (already divided by zoom by the caller so it feels constant on screen).
 */
export function snapCenter(layer, proposed, template, thresholdMm) {
  const canvasWidth = template.trim.width + template.bleed * 2;
  const canvasHeight = template.trim.height + template.bleed * 2;

  const targetsX = [
    { value: canvasWidth / 2, guide: "center-v" },
    { value: template.bleed + layer.width / 2, guide: "trim-left" },
    { value: template.bleed + template.trim.width - layer.width / 2, guide: "trim-right" },
  ];
  const targetsY = [
    { value: canvasHeight / 2, guide: "center-h" },
    { value: template.bleed + layer.height / 2, guide: "trim-top" },
    { value: template.bleed + template.trim.height - layer.height / 2, guide: "trim-bottom" },
  ];

  let x = proposed.x;
  let y = proposed.y;
  const guides = [];

  for (const target of targetsX) {
    if (Math.abs(proposed.x - target.value) <= thresholdMm) {
      x = target.value;
      guides.push(target.guide);
      break;
    }
  }

  for (const target of targetsY) {
    if (Math.abs(proposed.y - target.value) <= thresholdMm) {
      y = target.value;
      guides.push(target.guide);
      break;
    }
  }

  return { x, y, guides };
}

/**
 * Initial placement for a newly added image: fill ~70% of the trim area
 * while preserving the image aspect ratio, centred on the canvas.
 */
export function initialImagePlacement(naturalWidth, naturalHeight, template) {
  const canvasWidth = template.trim.width + template.bleed * 2;
  const canvasHeight = template.trim.height + template.bleed * 2;

  const maxW = template.trim.width * 0.7;
  const maxH = template.trim.height * 0.7;
  const aspect = naturalWidth / naturalHeight;

  let width = maxW;
  let height = width / aspect;
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }

  return {
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    width,
    height,
  };
}
