import { memo } from "react";

/**
 * Millimetre rulers along the canvas top and left edges. Rendered as
 * siblings of the canvas surface inside the scroll container, so they pan
 * and zoom with the artwork. Tick pitch adapts to zoom so labels never
 * collide.
 */
function pickStep(scale) {
  // Aim for labelled ticks every ~56 screen px.
  const targetMm = 56 / scale;
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  return steps.find((step) => step >= targetMm) || 500;
}

const RULER_THICKNESS = 18;

function StageRulers({ template, scale }) {
  const widthMm = template.trim.width + template.bleed * 2;
  const heightMm = template.trim.height + template.bleed * 2;
  const step = pickStep(scale);

  const ticks = (lengthMm) => {
    const result = [];
    for (let mm = 0; mm <= lengthMm; mm += step) {
      result.push(mm);
    }
    return result;
  };

  const style = {
    position: "absolute",
    background: "rgba(250,248,244,0.95)",
    color: "#9b9da4",
    fontSize: 9,
    fontVariantNumeric: "tabular-nums",
    userSelect: "none",
    pointerEvents: "none",
    zIndex: 35,
  };

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          ...style,
          left: 0,
          top: -RULER_THICKNESS,
          width: widthMm * scale,
          height: RULER_THICKNESS,
          borderBottom: "1px solid rgba(23,24,27,0.15)",
        }}
      >
        {ticks(widthMm).map((mm) => (
          <span key={mm} style={{ position: "absolute", left: mm * scale, bottom: 0 }}>
            <span style={{ position: "absolute", bottom: 0, left: 0, width: 1, height: 5, background: "rgba(23,24,27,0.35)" }} />
            <span style={{ position: "absolute", bottom: 5, left: 2, whiteSpace: "nowrap" }}>{mm}</span>
          </span>
        ))}
      </div>

      <div
        aria-hidden="true"
        style={{
          ...style,
          top: 0,
          left: -RULER_THICKNESS,
          width: RULER_THICKNESS,
          height: heightMm * scale,
          borderRight: "1px solid rgba(23,24,27,0.15)",
        }}
      >
        {ticks(heightMm).map((mm) => (
          <span key={mm} style={{ position: "absolute", top: mm * scale, right: 0 }}>
            <span style={{ position: "absolute", right: 0, top: 0, height: 1, width: 5, background: "rgba(23,24,27,0.35)" }} />
            <span
              style={{
                position: "absolute",
                top: 2,
                right: 6,
                whiteSpace: "nowrap",
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              {mm}
            </span>
          </span>
        ))}
      </div>
    </>
  );
}

// Depends only on template + scale, so it must not re-render per
// pointermove while a layer is being dragged.
export default memo(StageRulers);
