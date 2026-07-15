import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Image as ImageIcon, Lock, LockOpen, Trash2, Type } from "lucide-react";

const IconButton = ({ label, onClick, children, disabled }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="flex size-6 items-center justify-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
  >
    {children}
  </button>
);

/**
 * Layer list, top-most first (mirrors render order). Double-click a name to
 * rename. Every object on the canvas is a layer.
 */
function LayersPanel({ layers, selectedLayerId, actions }) {
  const [renamingId, setRenamingId] = useState(null);
  const [draftName, setDraftName] = useState("");

  const commitRename = (layer) => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== layer.name) {
      actions.updateLayer(layer.id, { name: trimmed.slice(0, 60) });
    }
    setRenamingId(null);
  };

  if (layers.length === 0) {
    return <p className="px-1 py-6 text-center text-xs text-ink-500">No layers yet. Upload artwork or add text to get started.</p>;
  }

  const ordered = [...layers].reverse();

  return (
    <ul className="flex flex-col gap-1" aria-label="Layers">
      {ordered.map((layer) => {
        const isSelected = layer.id === selectedLayerId;

        return (
          <li key={layer.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => actions.selectLayer(layer.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  actions.selectLayer(layer.id);
                }
              }}
              className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition ${
                isSelected ? "border-brand-400 bg-brand-50/60" : "border-transparent hover:bg-ink-50"
              }`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-100 bg-white text-ink-400">
                {layer.type === "image" ? (
                  layer.src ? (
                    <img src={layer.src} alt="" className="size-full object-cover" draggable={false} />
                  ) : (
                    <ImageIcon size={13} aria-hidden="true" />
                  )
                ) : (
                  <Type size={13} aria-hidden="true" />
                )}
              </span>

              {renamingId === layer.id ? (
                <input
                  autoFocus
                  value={draftName}
                  aria-label="Rename layer"
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={() => commitRename(layer)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitRename(layer);
                    if (event.key === "Escape") setRenamingId(null);
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="min-w-0 flex-1 rounded-md border border-brand-300 px-1.5 py-0.5 text-xs text-ink-900 focus:outline-none"
                />
              ) : (
                <span
                  className={`min-w-0 flex-1 truncate text-xs font-medium ${layer.hidden ? "text-ink-400 line-through" : "text-ink-800"}`}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    setRenamingId(layer.id);
                    setDraftName(layer.name);
                  }}
                  title="Double-click to rename"
                >
                  {layer.name}
                </span>
              )}

              <IconButton
                label={layer.hidden ? "Show layer" : "Hide layer"}
                onClick={() => actions.updateLayer(layer.id, { hidden: !layer.hidden })}
              >
                {layer.hidden ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
              </IconButton>
              <IconButton
                label={layer.locked ? "Unlock layer" : "Lock layer"}
                onClick={() => actions.updateLayer(layer.id, { locked: !layer.locked })}
              >
                {layer.locked ? <Lock size={13} aria-hidden="true" /> : <LockOpen size={13} aria-hidden="true" />}
              </IconButton>
              <IconButton label="Move up" onClick={() => actions.reorderLayer(layer.id, "forward")}>
                <ArrowUp size={13} aria-hidden="true" />
              </IconButton>
              <IconButton label="Move down" onClick={() => actions.reorderLayer(layer.id, "backward")}>
                <ArrowDown size={13} aria-hidden="true" />
              </IconButton>
              <IconButton label="Duplicate layer" onClick={() => actions.duplicateLayer(layer.id)}>
                <Copy size={13} aria-hidden="true" />
              </IconButton>
              <IconButton label="Delete layer" onClick={() => actions.removeLayer(layer.id)} disabled={layer.locked}>
                <Trash2 size={13} aria-hidden="true" />
              </IconButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default LayersPanel;
