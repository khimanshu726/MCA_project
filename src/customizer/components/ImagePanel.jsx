import { DEFAULT_FILTERS } from "../state/editorReducer.js";

const FILTERS = [
  { id: "brightness", label: "Brightness", min: 40, max: 160 },
  { id: "contrast", label: "Contrast", min: 40, max: 160 },
  { id: "saturation", label: "Saturation", min: 0, max: 200 },
];

/** Adjustment sliders for the selected image layer. */
function ImagePanel({ selectedLayer, actions }) {
  const imageLayer = selectedLayer?.type === "image" ? selectedLayer : null;

  if (!imageLayer) {
    return <p className="px-1 py-4 text-center text-xs text-ink-500">Select an image layer to adjust it.</p>;
  }

  const filters = imageLayer.filters || DEFAULT_FILTERS;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-3">
      {FILTERS.map((filter) => (
        <label key={filter.id} className="flex flex-col gap-1">
          <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            {filter.label}
            <span className="tabular-nums text-ink-400">{filters[filter.id] ?? 100}%</span>
          </span>
          <input
            type="range"
            min={filter.min}
            max={filter.max}
            value={filters[filter.id] ?? 100}
            disabled={imageLayer.locked}
            aria-label={filter.label}
            onPointerDown={() => actions.beginTransaction()}
            onChange={(event) =>
              actions.updateLayer(
                imageLayer.id,
                { filters: { ...filters, [filter.id]: Number(event.target.value) } },
                { transient: true },
              )
            }
            onPointerUp={() => actions.endTransaction()}
            className="accent-brand-500"
          />
        </label>
      ))}

      <button
        type="button"
        disabled={imageLayer.locked}
        onClick={() => actions.updateLayer(imageLayer.id, { filters: { ...DEFAULT_FILTERS } })}
        className="self-start rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-40"
      >
        Reset adjustments
      </button>
    </div>
  );
}

export default ImagePanel;
