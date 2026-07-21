import { memo } from "react";
import { ArrowDown, ArrowUp, Copy, Lock, LockOpen, Trash2 } from "lucide-react";

/**
 * Floating per-object quick-action toolbar for touch (lg:hidden).
 *
 * Selecting a layer on a phone surfaces the actions people reach for most —
 * duplicate, arrange, lock, delete — as one tap over the canvas, instead of
 * hunting for them inside the inspector sheet. Full editing (opacity, crop,
 * type-specific tools) still lives in the sheet, which opens on the same
 * selection; this bar just puts the common verbs within thumb reach.
 *
 * It renders inside the canvas zone and is positioned `absolute` against it —
 * never fixed/portalled — per the studio's overlay-ownership rule.
 */
const BarButton = ({ label, onClick, disabled, active, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={`flex size-11 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      active ? "bg-brand-50 text-brand-600" : "text-ink-700 hover:bg-ink-100"
    }`}
  >
    {children}
  </button>
);

function StudioObjectBar({ layer, actions }) {
  if (!layer) {
    return null;
  }

  const locked = Boolean(layer.locked);

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-ink-100 bg-white/95 p-1 shadow-overlay backdrop-blur lg:hidden">
      <BarButton
        label={locked ? "Unlock" : "Lock"}
        active={locked}
        onClick={() => actions.updateLayer(layer.id, { locked: !locked })}
      >
        {locked ? <Lock size={18} aria-hidden="true" /> : <LockOpen size={18} aria-hidden="true" />}
      </BarButton>
      <BarButton label="Duplicate" onClick={() => actions.duplicateLayer(layer.id)}>
        <Copy size={18} aria-hidden="true" />
      </BarButton>
      <BarButton label="Bring forward" disabled={locked} onClick={() => actions.reorderLayer(layer.id, "forward")}>
        <ArrowUp size={18} aria-hidden="true" />
      </BarButton>
      <BarButton label="Send backward" disabled={locked} onClick={() => actions.reorderLayer(layer.id, "backward")}>
        <ArrowDown size={18} aria-hidden="true" />
      </BarButton>
      <BarButton label="Delete" disabled={locked} onClick={() => actions.removeLayer(layer.id)}>
        <Trash2 size={18} aria-hidden="true" />
      </BarButton>
    </div>
  );
}

export default memo(StudioObjectBar);
