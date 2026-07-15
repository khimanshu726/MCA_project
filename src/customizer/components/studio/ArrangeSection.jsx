import { ArrowDown, ArrowUp, Copy, Lock, LockOpen, Trash2 } from "lucide-react";

const ActionButton = ({ label, onClick, disabled, active, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={`flex size-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? "border-brand-400 bg-brand-50 text-brand-600"
        : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-600"
    }`}
  >
    {children}
  </button>
);

/** Layer-agnostic arrange controls shared by every selection context. */
function ArrangeSection({ layer, actions }) {
  const disabled = layer.locked;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ActionButton
          label={layer.locked ? "Unlock layer" : "Lock layer"}
          active={layer.locked}
          onClick={() => actions.updateLayer(layer.id, { locked: !layer.locked })}
        >
          {layer.locked ? <Lock size={14} aria-hidden="true" /> : <LockOpen size={14} aria-hidden="true" />}
        </ActionButton>
        <ActionButton label="Duplicate (Ctrl+D)" onClick={() => actions.duplicateLayer(layer.id)}>
          <Copy size={14} aria-hidden="true" />
        </ActionButton>
        <ActionButton label="Bring forward" disabled={disabled} onClick={() => actions.reorderLayer(layer.id, "forward")}>
          <ArrowUp size={14} aria-hidden="true" />
        </ActionButton>
        <ActionButton label="Send backward" disabled={disabled} onClick={() => actions.reorderLayer(layer.id, "backward")}>
          <ArrowDown size={14} aria-hidden="true" />
        </ActionButton>
        <ActionButton label="Delete (Del)" disabled={disabled} onClick={() => actions.removeLayer(layer.id)}>
          <Trash2 size={14} aria-hidden="true" />
        </ActionButton>
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-500">
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
          className="min-w-0 flex-1 accent-brand-500"
        />
        <span className="w-8 text-right tabular-nums">{Math.round((layer.opacity ?? 1) * 100)}%</span>
      </label>
    </div>
  );
}

export default ArrangeSection;
