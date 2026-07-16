import { memo, useMemo } from "react";
import { getSafeRect, getTrimRect } from "../templates.js";

/**
 * Grid is its own memoised component: on a 1830mm banner at a 10mm pitch
 * it's ~248 <line> elements, and it only depends on template + scale — it
 * must not rebuild on every pointermove of a drag.
 */
const StageGrid = memo(function StageGrid({ template, scale, canvasW, canvasH }) {
  const lines = useMemo(() => {
    const stepMm = 10;
    const result = [];
    for (let x = stepMm; x < template.trim.width + template.bleed * 2; x += stepMm) {
      result.push(
        <line key={`gx${x}`} x1={x * scale} y1={0} x2={x * scale} y2={canvasH} stroke="rgba(23,24,27,0.06)" strokeWidth="1" />,
      );
    }
    for (let y = stepMm; y < template.trim.height + template.bleed * 2; y += stepMm) {
      result.push(
        <line key={`gy${y}`} x1={0} y1={y * scale} x2={canvasW} y2={y * scale} stroke="rgba(23,24,27,0.06)" strokeWidth="1" />,
      );
    }
    return result;
  }, [template, scale, canvasW, canvasH]);

  return <g>{lines}</g>;
});

/**
 * Print guides drawn over the canvas: shaded bleed margin, solid trim line,
 * dashed safe area, and live snap guides during drags. SVG so the lines
 * stay crisp at any zoom.
 */
function StageGuides({ template, scale, snapGuides = [], showGrid = false, showGuides = true }) {
  const canvasW = (template.trim.width + template.bleed * 2) * scale;
  const canvasH = (template.trim.height + template.bleed * 2) * scale;
  const trim = getTrimRect(template);
  const safe = getSafeRect(template);

  const trimPx = {
    x: trim.x * scale,
    y: trim.y * scale,
    width: trim.width * scale,
    height: trim.height * scale,
  };
  const safePx = {
    x: safe.x * scale,
    y: safe.y * scale,
    width: safe.width * scale,
    height: safe.height * scale,
  };

  return (
    <svg
      width={canvasW}
      height={canvasH}
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 30 }}
      aria-hidden="true"
    >
      {showGrid && <StageGrid template={template} scale={scale} canvasW={canvasW} canvasH={canvasH} />}

      {showGuides && (
        <>
          {/* Bleed margin: everything outside the trim line gets cut away. */}
          {template.bleed > 0 && (
            <path
              d={`M0 0 H${canvasW} V${canvasH} H0 Z M${trimPx.x} ${trimPx.y} H${trimPx.x + trimPx.width} V${trimPx.y + trimPx.height} H${trimPx.x} Z`}
              fill="rgba(178,58,43,0.08)"
              fillRule="evenodd"
            />
          )}

          <rect
            x={trimPx.x}
            y={trimPx.y}
            width={trimPx.width}
            height={trimPx.height}
            fill="none"
            stroke="rgba(23,24,27,0.55)"
            strokeWidth="1.5"
          />

          <rect
            x={safePx.x}
            y={safePx.y}
            width={safePx.width}
            height={safePx.height}
            fill="none"
            stroke="rgba(75,107,91,0.7)"
            strokeWidth="1.25"
            strokeDasharray="6 4"
          />
        </>
      )}

      {snapGuides.includes("center-v") && (
        <line x1={canvasW / 2} y1={0} x2={canvasW / 2} y2={canvasH} stroke="#b8461d" strokeWidth="1.25" strokeDasharray="4 3" />
      )}
      {snapGuides.includes("center-h") && (
        <line x1={0} y1={canvasH / 2} x2={canvasW} y2={canvasH / 2} stroke="#b8461d" strokeWidth="1.25" strokeDasharray="4 3" />
      )}
      {snapGuides.includes("trim-left") && (
        <line x1={trimPx.x} y1={0} x2={trimPx.x} y2={canvasH} stroke="#b8461d" strokeWidth="1.25" />
      )}
      {snapGuides.includes("trim-right") && (
        <line x1={trimPx.x + trimPx.width} y1={0} x2={trimPx.x + trimPx.width} y2={canvasH} stroke="#b8461d" strokeWidth="1.25" />
      )}
      {snapGuides.includes("trim-top") && (
        <line x1={0} y1={trimPx.y} x2={canvasW} y2={trimPx.y} stroke="#b8461d" strokeWidth="1.25" />
      )}
      {snapGuides.includes("trim-bottom") && (
        <line x1={0} y1={trimPx.y + trimPx.height} x2={canvasW} y2={trimPx.y + trimPx.height} stroke="#b8461d" strokeWidth="1.25" />
      )}
    </svg>
  );
}

export default StageGuides;
