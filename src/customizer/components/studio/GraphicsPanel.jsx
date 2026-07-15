import { memo } from "react";
import { GRAPHICS } from "../../graphics.js";
import { createIconLayer } from "../../state/editorReducer.js";

/** Left-rail Graphics panel: curated vector icons that print crisp. */
function GraphicsPanel({ template, actions }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {GRAPHICS.map((graphic) => (
        <button
          key={graphic.id}
          type="button"
          title={graphic.label}
          aria-label={`Add ${graphic.label} graphic`}
          onClick={() =>
            actions.addLayer(createIconLayer({ template, pathData: graphic.pathData, name: graphic.label }))
          }
          className="flex aspect-square items-center justify-center rounded-xl bg-ink-50 text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
            <path d={graphic.pathData} fill="currentColor" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default memo(GraphicsPanel);
