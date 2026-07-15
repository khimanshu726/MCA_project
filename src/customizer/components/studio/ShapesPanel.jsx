import { memo } from "react";
import { createShapeLayer } from "../../state/editorReducer.js";

const SHAPES = [
  { kind: "rect", label: "Rectangle" },
  { kind: "ellipse", label: "Circle" },
  { kind: "triangle", label: "Triangle" },
  { kind: "line", label: "Line" },
];

const ShapePreview = ({ kind }) => {
  const common = { fill: "currentColor" };
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 text-ink-700" aria-hidden="true">
      {kind === "rect" && <rect x="6" y="10" width="28" height="20" rx="2" {...common} />}
      {kind === "ellipse" && <circle cx="20" cy="20" r="13" {...common} />}
      {kind === "triangle" && <polygon points="20,7 34,33 6,33" {...common} />}
      {kind === "line" && <rect x="5" y="18.5" width="30" height="3" {...common} />}
    </svg>
  );
};

/** Left-rail Shapes panel. */
function ShapesPanel({ template, actions }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SHAPES.map((shape) => (
        <button
          key={shape.kind}
          type="button"
          onClick={() => actions.addLayer(createShapeLayer({ template, kind: shape.kind, name: shape.label }))}
          className="flex flex-col items-center gap-2 rounded-xl bg-ink-50 px-3 py-3 transition-colors hover:bg-ink-100"
        >
          <ShapePreview kind={shape.kind} />
          <span className="text-xs font-medium text-ink-700">{shape.label}</span>
        </button>
      ))}
    </div>
  );
}

export default memo(ShapesPanel);
