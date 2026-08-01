import { memo } from "react";
import { GRAPHICS } from "../../graphics.js";
import { createIconLayer } from "../../state/editorReducer.js";

/** Left-rail Graphics panel: curated vector icons that print crisp. */
function GraphicsPanel({ template, actions }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-400">Icons</p>
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
            className="flex aspect-square items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-700 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400 hover:text-brand-500 hover:shadow-raised"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
              <path d={graphic.pathData} fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(GraphicsPanel);
