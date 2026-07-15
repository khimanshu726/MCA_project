import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Image as ImageIcon, Lock, LockOpen, Shapes, Sparkles, Trash2, Type } from "lucide-react";

const IconButton = ({ label, onClick, children, disabled }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="flex size-6 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
  >
    {children}
  </button>
);

/**
 * Layer list, top-most first (mirrors render order). Double-click a name to
 * rename; drag rows to reorder. Every object on the canvas is a layer.
 */
function LayersPanel({ layers, selectedLayerId, actions }) {
  const [renamingId, setRenamingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  // The list renders top-most first, so a displayed row index maps to the
  // real layers array as (length - 1 - rowIndex).
  const handleDrop = (targetLayerId) => {
    if (!draggingId || draggingId === targetLayerId) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }
    const targetIndex = layers.findIndex((layer) => layer.id === targetLayerId);
    actions.reorderLayer(draggingId, undefined, targetIndex);
    setDraggingId(null);
    setDropTargetId(null);
  };

  const commitRename = (layer) => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== layer.name) {
      actions.updateLayer(layer.id, { name: trimmed.slice(0, 60) });
    }
    setRenamingId(null);
  };

  if (layers.length === 0) {
    return <span className="block px-1 py-6 text-center text-xs text-ink-500">No layers yet. Upload artwork or add text to get started.</span>;
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
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                setDraggingId(layer.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTargetId(layer.id);
              }}
              onDragLeave={() => setDropTargetId((current) => (current === layer.id ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(layer.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              onClick={() => actions.selectLayer(layer.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  actions.selectLayer(layer.id);
                }
              }}
              className={`flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 ${
                isSelected ? "bg-ink-100" : "hover:bg-ink-50"
              } ${draggingId === layer.id ? "opacity-40" : ""} ${
                dropTargetId === layer.id && draggingId !== layer.id ? "ring-2 ring-brand-400" : ""
              }`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-ink-400">
                {layer.type === "image" ? (
                  layer.src ? (
                    <img src={layer.src} alt="" className="size-full object-cover" draggable={false} />
                  ) : (
                    <ImageIcon size={13} aria-hidden="true" />
                  )
                ) : layer.type === "shape" ? (
                  <Shapes size={13} aria-hidden="true" />
                ) : layer.type === "icon" ? (
                  <Sparkles size={13} aria-hidden="true" />
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
                  className="min-w-0 flex-1 rounded-lg border border-brand-300 px-1.5 py-0.5 text-xs text-ink-900 focus:outline-none"
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
