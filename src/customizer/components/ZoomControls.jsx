import { Maximize, Minus, Plus } from "lucide-react";

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

function ZoomControls({ zoom, onZoomChange }) {
  const zoomOut = () => {
    const next = [...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001);
    onZoomChange(next ?? ZOOM_STEPS[0]);
  };

  const zoomIn = () => {
    const next = ZOOM_STEPS.find((step) => step > zoom + 0.001);
    onZoomChange(next ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2 py-1 shadow-sm">
      <button
        type="button"
        onClick={zoomOut}
        aria-label="Zoom out"
        className="flex size-6 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"
      >
        <Minus size={13} aria-hidden="true" />
      </button>
      <span className="min-w-11 text-center text-xs font-semibold tabular-nums text-ink-700">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={zoomIn}
        aria-label="Zoom in"
        className="flex size-6 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"
      >
        <Plus size={13} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onZoomChange(1)}
        aria-label="Fit to screen"
        title="Fit to screen"
        className="flex size-6 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"
      >
        <Maximize size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

export default ZoomControls;
