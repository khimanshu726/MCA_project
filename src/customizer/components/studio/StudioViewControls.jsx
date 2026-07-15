import { memo } from "react";
import { Grid3x3, Maximize2, Minus, Plus, Ruler, SquareDashed } from "lucide-react";

/**
 * Floating view cluster over the canvas — Figma/Canva placement. Lives here
 * rather than in the app bar for two reasons: the bar would wrap (and a
 * wrapping app bar reads as a web page), and the true scale is only known
 * inside the canvas.
 *
 * The percentage shown is the REAL scale (fitScale × zoom), not the raw
 * `ui.zoom` multiplier. `ui.zoom === 1` means "fit to container", so the old
 * readout claimed "100%" while a 1830mm banner sat at ~34% of actual size —
 * a design tool that misreports scale is worse than one with no readout.
 */

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

const Toggle = ({ label, active, onClick, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
      active ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:bg-ink-50 hover:text-ink-800"
    }`}
  >
    {children}
  </button>
);

function StudioViewControls({
  zoom,
  fitScale,
  onZoomChange,
  showGrid,
  onToggleGrid,
  showGuides,
  onToggleGuides,
  showRulers,
  onToggleRulers,
}) {
  const zoomOut = () => onZoomChange([...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001) ?? ZOOM_STEPS[0]);
  const zoomIn = () => onZoomChange(ZOOM_STEPS.find((step) => step > zoom + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);

  const actualScale = Math.round(fitScale * zoom * 100);

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-30 flex items-center gap-0.5 rounded-2xl bg-white/95 p-1 shadow-overlay backdrop-blur">
      <button
        type="button"
        title="Zoom out"
        aria-label="Zoom out"
        onClick={zoomOut}
        className="flex size-7 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-800"
      >
        <Minus size={14} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onZoomChange(1)}
        title="Fit to screen"
        className="min-w-12 rounded-lg px-1 py-1 text-center text-xs font-semibold tabular-nums text-ink-700 transition-colors hover:bg-ink-50"
      >
        {Number.isFinite(actualScale) ? actualScale : 100}%
      </button>

      <button
        type="button"
        title="Zoom in"
        aria-label="Zoom in"
        onClick={zoomIn}
        className="flex size-7 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-800"
      >
        <Plus size={14} aria-hidden="true" />
      </button>

      <span className="mx-0.5 h-5 w-px bg-ink-100" aria-hidden="true" />

      <Toggle label="Fit to screen" onClick={() => onZoomChange(1)}>
        <Maximize2 size={13} aria-hidden="true" />
      </Toggle>
      <Toggle label={showGrid ? "Hide grid" : "Show grid"} active={showGrid} onClick={onToggleGrid}>
        <Grid3x3 size={13} aria-hidden="true" />
      </Toggle>
      <Toggle label={showGuides ? "Hide print guides" : "Show print guides"} active={showGuides} onClick={onToggleGuides}>
        <SquareDashed size={13} aria-hidden="true" />
      </Toggle>
      <Toggle label={showRulers ? "Hide rulers" : "Show rulers"} active={showRulers} onClick={onToggleRulers}>
        <Ruler size={13} aria-hidden="true" />
      </Toggle>
    </div>
  );
}

export default memo(StudioViewControls);
