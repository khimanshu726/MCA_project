import { getSafeRect, getTrimRect } from "../templates.js";
import { effectiveDpi, layerCorners, qualityLevel } from "./geometry.js";

/**
 * Print-readiness checks run before a design can be added to the cart.
 * Errors block checkout; warnings are surfaced for confirmation — a
 * customer may intentionally bleed artwork past the trim line.
 */
export function validateDesignForPrint(design, template) {
  const errors = [];
  const warnings = [];

  const sideEntries = Object.entries(design.sides);
  const visibleLayerCount = sideEntries.reduce(
    (count, [, side]) => count + side.layers.filter((layer) => !layer.hidden).length,
    0,
  );

  if (visibleLayerCount === 0) {
    errors.push("The design is empty — add artwork or text before continuing.");
    return { errors, warnings };
  }

  const trim = getTrimRect(template);
  const safe = getSafeRect(template);

  for (const [sideId, side] of sideEntries) {
    const sideLabel = template.sides.find((entry) => entry.id === sideId)?.label || sideId;

    for (const layer of side.layers) {
      if (layer.hidden) {
        continue;
      }

      const corners = layerCorners(layer);
      const minX = Math.min(...corners.map((corner) => corner.x));
      const maxX = Math.max(...corners.map((corner) => corner.x));
      const minY = Math.min(...corners.map((corner) => corner.y));
      const maxY = Math.max(...corners.map((corner) => corner.y));

      // Entirely outside the trim box = cut away in production.
      if (maxX <= trim.x || minX >= trim.x + trim.width || maxY <= trim.y || minY >= trim.y + trim.height) {
        warnings.push(`"${layer.name}" on ${sideLabel} sits entirely outside the printed area and will be cut off.`);
        continue;
      }

      if (layer.type === "text") {
        // Text crossing the safe boundary risks being trimmed.
        if (minX < safe.x || maxX > safe.x + safe.width || minY < safe.y || maxY > safe.y + safe.height) {
          warnings.push(`"${layer.name}" on ${sideLabel} extends past the safe area — text this close to the edge may be trimmed.`);
        }
      }

      if (layer.type === "image") {
        const dpi = effectiveDpi(layer);
        const level = qualityLevel(dpi, template);
        if (level === "poor") {
          warnings.push(
            `"${layer.name}" on ${sideLabel} is ${dpi} DPI — below the ${template.minDpi} DPI minimum, it will print blurry. Use a larger image or shrink it.`,
          );
        }
      }
    }
  }

  return { errors, warnings };
}
