import { memo, useEffect, useRef, useState } from "react";
import { Check, Grid3x3, Minus, Plus, Ruler, SquareDashed } from "lucide-react";
import StudioTooltip from "./StudioTooltip.jsx";
import { CSS_PX_PER_MM, scaleToZoomPercent } from "../../engine/geometry.js";

/**
 * Floating view cluster over the canvas — Figma/Canva placement. It lives
 * here rather than the app bar because the bar would wrap, and because the
 * true scale is only known inside the canvas.
 *
 * Zoom is expressed through named presets first and a percentage second.
 * `ui.zoom` is a multiplier on fit, and fit varies enormously by product
 * (a banner fits at 0.48 px/mm, a business card at 9.35), so a raw number
 * is unreadable across products — "Fit" means the same thing everywhere,
 * and 100% now honestly means actual printed size.
 */

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

const Toggle = ({ label, active, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    className={`group relative flex size-7 items-center justify-center rounded-lg transition-colors duration-150 ${
      active ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:bg-ink-50 hover:text-ink-800"
    }`}
  >
    {children}
    <StudioTooltip label={label} side="top" />
  </button>
);

function StudioViewControls({
  zoom,
  fitScale,
  fitWidthScale,
  onZoomChange,
  showGrid,
  onToggleGrid,
  showGuides,
  onToggleGuides,
  showRulers,
  onToggleRulers,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isMenuOpen]);

  const zoomOut = () => onZoomChange([...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001) ?? ZOOM_STEPS[0]);
  const zoomIn = () => onZoomChange(ZOOM_STEPS.find((step) => step > zoom + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);

  const isFit = Math.abs(zoom - 1) < 0.005;
  const percent = scaleToZoomPercent(fitScale * zoom);
  const label = isFit ? "Fit" : `${percent}%`;

  const presets = [
    { id: "fit", label: "Fit to screen", hint: "Whole artboard", apply: () => onZoomChange(1) },
    {
      id: "width",
      label: "Fit width",
      hint: "Fill the workspace",
      apply: () => onZoomChange(fitWidthScale / fitScale),
    },
    {
      id: "actual",
      label: "Actual size",
      hint: "100% — printed size",
      apply: () => onZoomChange(CSS_PX_PER_MM / fitScale),
    },
  ];

  return (
    <div
      ref={menuRef}
      className="pointer-events-auto absolute bottom-4 right-4 z-30 flex items-center gap-0.5 rounded-2xl bg-white/95 p-1 shadow-overlay backdrop-blur"
    >
      <button
        type="button"
        aria-label="Zoom out"
        onClick={zoomOut}
        className="group relative flex size-7 items-center justify-center rounded-lg text-ink-500 transition-colors duration-150 hover:bg-ink-50 hover:text-ink-800"
      >
        <Minus size={14} aria-hidden="true" />
        <StudioTooltip label="Zoom out" side="top" />
      </button>

      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="min-w-14 rounded-lg px-2 py-1 text-center text-xs font-semibold tabular-nums text-ink-700 transition-colors duration-150 hover:bg-ink-50"
        >
          {label}
        </button>

        {isMenuOpen && (
          <div
            role="menu"
            className="absolute bottom-full right-0 mb-2 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-overlay motion-safe:animate-[studio-fade-in_140ms_cubic-bezier(0.22,1,0.36,1)]"
          >
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  preset.apply();
                  setIsMenuOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-ink-50"
              >
                <span className="flex flex-col">
                  <span className="text-xs font-medium text-ink-900">{preset.label}</span>
                  <span className="text-xs text-ink-400">{preset.hint}</span>
                </span>
                {preset.id === "fit" && isFit ? (
                  <Check size={13} className="shrink-0 text-brand-500" aria-hidden="true" />
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Zoom in"
        onClick={zoomIn}
        className="group relative flex size-7 items-center justify-center rounded-lg text-ink-500 transition-colors duration-150 hover:bg-ink-50 hover:text-ink-800"
      >
        <Plus size={14} aria-hidden="true" />
        <StudioTooltip label="Zoom in" side="top" />
      </button>

      <span className="mx-0.5 h-5 w-px bg-ink-100" aria-hidden="true" />

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
