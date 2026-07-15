import {
  ArrowDown,
  ArrowUp,
  Copy,
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Lock,
  LockOpen,
  RotateCw,
  Trash2,
} from "lucide-react";
import QualityBadge from "./QualityBadge.jsx";

const ToolButton = ({ label, onClick, disabled, children, active = false }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={`flex size-8 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? "border-brand-400 bg-brand-50 text-brand-600"
        : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-600"
    }`}
  >
    {children}
  </button>
);

/**
 * Context toolbar for the selected layer: layer-agnostic actions plus
 * image-specific transforms. Text styling lives in the Text panel.
 */
function SelectionToolbar({ layer, template, actions, onReplaceImage }) {
  if (!layer) {
    return null;
  }

  const isImage = layer.type === "image";
  const disabled = layer.locked;

  const rotate90 = () => {
    actions.updateLayer(layer.id, { rotation: ((layer.rotation || 0) + 90) % 360 });
  };

  const resetImage = () => {
    actions.updateLayer(layer.id, {
      rotation: 0,
      flipH: false,
      flipV: false,
      opacity: 1,
      crop: { x: 0, y: 0, width: 1, height: 1 },
      filters: { brightness: 100, contrast: 100, saturation: 100 },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-ink-100 bg-white px-2.5 py-2 shadow-sm">
      <ToolButton label={layer.locked ? "Unlock layer" : "Lock layer"} onClick={() => actions.updateLayer(layer.id, { locked: !layer.locked })} active={layer.locked}>
        {layer.locked ? <Lock size={14} aria-hidden="true" /> : <LockOpen size={14} aria-hidden="true" />}
      </ToolButton>
      <ToolButton label="Duplicate (Ctrl+D)" onClick={() => actions.duplicateLayer(layer.id)}>
        <Copy size={14} aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Bring forward" onClick={() => actions.reorderLayer(layer.id, "forward")} disabled={disabled}>
        <ArrowUp size={14} aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Send backward" onClick={() => actions.reorderLayer(layer.id, "backward")} disabled={disabled}>
        <ArrowDown size={14} aria-hidden="true" />
      </ToolButton>

      {isImage && (
        <>
          <span className="mx-1 h-5 w-px bg-ink-100" aria-hidden="true" />
          <ToolButton label="Crop" onClick={() => actions.setCropMode(layer.id)} disabled={disabled}>
            <Crop size={14} aria-hidden="true" />
          </ToolButton>
          <ToolButton label="Rotate 90°" onClick={rotate90} disabled={disabled}>
            <RotateCw size={14} aria-hidden="true" />
          </ToolButton>
          <ToolButton label="Flip horizontal" onClick={() => actions.updateLayer(layer.id, { flipH: !layer.flipH })} disabled={disabled} active={layer.flipH}>
            <FlipHorizontal2 size={14} aria-hidden="true" />
          </ToolButton>
          <ToolButton label="Flip vertical" onClick={() => actions.updateLayer(layer.id, { flipV: !layer.flipV })} disabled={disabled} active={layer.flipV}>
            <FlipVertical2 size={14} aria-hidden="true" />
          </ToolButton>
          {onReplaceImage && (
            <button
              type="button"
              onClick={onReplaceImage}
              disabled={disabled}
              className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-40"
            >
              Replace
            </button>
          )}
          <button
            type="button"
            onClick={resetImage}
            disabled={disabled}
            className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-40"
          >
            Reset
          </button>
        </>
      )}

      <span className="mx-1 h-5 w-px bg-ink-100" aria-hidden="true" />

      <label className="flex items-center gap-1.5 text-xs text-ink-500">
        Opacity
        <input
          type="range"
          min="10"
          max="100"
          value={Math.round((layer.opacity ?? 1) * 100)}
          disabled={disabled}
          aria-label="Layer opacity"
          onPointerDown={() => actions.beginTransaction()}
          onChange={(event) => actions.updateLayer(layer.id, { opacity: Number(event.target.value) / 100 }, { transient: true })}
          onPointerUp={() => actions.endTransaction()}
          className="w-20 accent-brand-500"
        />
      </label>

      <ToolButton label="Delete (Del)" onClick={() => actions.removeLayer(layer.id)} disabled={disabled}>
        <Trash2 size={14} aria-hidden="true" />
      </ToolButton>

      {isImage && (
        <span className="ml-auto">
          <QualityBadge layer={layer} template={template} />
        </span>
      )}
    </div>
  );
}

export default SelectionToolbar;
