import { memo, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Cloud, Eye, Loader2, Redo2, ShoppingBag, Undo2 } from "lucide-react";

/**
 * The studio's only header. Three fixed zones that never wrap — an app bar
 * that reflows to two rows is the single strongest "this is a web page"
 * tell, so view controls (zoom/grid/guides/rulers) deliberately live on the
 * canvas instead, and the product picker lives in the inspector.
 *
 * Zones: [brand · back · name · history · save state] [sides] [actions]
 */

const IconButton = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="flex size-8 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30"
  >
    {children}
  </button>
);

function ProjectName({ value, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = draft.trim();
    setIsEditing(false);
    if (trimmed && trimmed !== value) {
      onChange(trimmed.slice(0, 120));
    } else {
      setDraft(value);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        aria-label="Project name"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setDraft(value);
            setIsEditing(false);
          }
        }}
        className="w-44 rounded-lg border border-brand-400 bg-white px-2 py-1 text-sm font-medium text-ink-900 outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      title="Rename project"
      className="max-w-44 truncate rounded-lg px-2 py-1 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100"
    >
      {value}
    </button>
  );
}

function StudioAppBar({
  projectName,
  onProjectNameChange,
  onBack,
  sides,
  activeSideId,
  onSideChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDirty,
  isPersisting,
  isExporting,
  onPreview,
  onSave,
  onAddToCart,
}) {
  return (
    <div className="relative flex w-full items-center gap-1">
      {/* Zone 1 — identity + document */}
      <button
        type="button"
        onClick={onBack}
        title="Back to products"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-ink-100"
      >
        <ChevronLeft size={16} className="text-ink-500" aria-hidden="true" />
        <span className="size-6 shrink-0 rounded-md bg-brand-500" aria-hidden="true" />
        <span className="hidden font-display text-sm text-ink-900 sm:inline">Elite Empressions</span>
        <span className="sr-only">Back to products</span>
      </button>

      <span className="mx-1 h-5 w-px shrink-0 bg-ink-100" aria-hidden="true" />

      <ProjectName value={projectName} onChange={onProjectNameChange} />

      <IconButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
        <Undo2 size={15} aria-hidden="true" />
      </IconButton>
      <IconButton label="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo}>
        <Redo2 size={15} aria-hidden="true" />
      </IconButton>

      <span
        aria-live="polite"
        className="ml-1 hidden items-center gap-1.5 text-xs text-ink-400 md:flex"
      >
        {isDirty ? (
          <>
            <Cloud size={13} aria-hidden="true" />
            Saving…
          </>
        ) : (
          <>
            <Check size={13} className="text-sage-500" aria-hidden="true" />
            Saved
          </>
        )}
      </span>

      {/* Zone 2 — artboard identity, dead centre */}
      {sides.length > 1 && (
        <div
          role="tablist"
          aria-label="Product sides"
          className="absolute left-1/2 hidden -translate-x-1/2 rounded-lg bg-ink-100 p-0.5 lg:flex"
        >
          {sides.map((side) => (
            <button
              key={side.id}
              type="button"
              role="tab"
              aria-selected={activeSideId === side.id}
              onClick={() => onSideChange(side.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeSideId === side.id ? "bg-white text-ink-900 shadow-panel" : "text-ink-500 hover:text-ink-800"
              }`}
            >
              {side.label}
            </button>
          ))}
        </div>
      )}

      {/* Zone 3 — actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-100"
        >
          <Eye size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Preview</span>
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isPersisting}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-xs font-medium text-ink-800 transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:opacity-50"
        >
          {isPersisting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
          Save
        </button>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={isExporting}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {isExporting ? (
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingBag size={13} aria-hidden="true" />
          )}
          {isExporting ? "Preparing…" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}

export default memo(StudioAppBar);
