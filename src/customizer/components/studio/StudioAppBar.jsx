import { memo, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Cloud, Eye, Loader2, Redo2, ShoppingBag, Undo2 } from "lucide-react";
import StudioTooltip from "./StudioTooltip.jsx";

/**
 * The studio's only header. Three fixed zones that never wrap — an app bar
 * that reflows to two rows is the single strongest "this is a web page"
 * tell, so view controls (zoom/grid/guides/rulers) deliberately live on the
 * canvas instead, and the product picker lives in the inspector.
 *
 * Zones: [brand · back · name · history · save state] [sides] [actions]
 */

const IconButton = ({ label, shortcut, onClick, disabled, children }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="group relative flex size-8 items-center justify-center rounded-lg text-ink-600 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30"
  >
    {children}
    <StudioTooltip label={label} shortcut={shortcut} side="bottom" />
  </button>
);

/** Groups are separated by a hairline so related actions read as a set. */
const Divider = () => <span className="mx-1.5 h-5 w-px shrink-0 bg-ink-100" aria-hidden="true" />;

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
    <div className="relative flex w-full items-center">
      {/* Group 1 — navigation */}
      <button
        type="button"
        onClick={onBack}
        className="group relative flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-600 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900"
        aria-label="Back to product"
      >
        <ChevronLeft size={17} aria-hidden="true" />
        <StudioTooltip label="Back to product" side="bottom" />
      </button>

      <span className="ml-1 mr-2 flex shrink-0 items-center gap-2" aria-hidden="true">
        <span className="size-6 shrink-0 rounded-lg bg-brand-500" />
        <span className="hidden font-display text-sm text-ink-900 xl:inline">Elite Empressions</span>
      </span>

      <Divider />

      {/* Group 2 — project */}
      <ProjectName value={projectName} onChange={onProjectNameChange} />
      <span
        aria-live="polite"
        className="ml-1 hidden shrink-0 items-center gap-2 text-xs text-ink-400 md:flex"
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

      {/* Group 3 — artboard identity, dead centre */}
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
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                activeSideId === side.id ? "bg-white text-ink-900 shadow-panel" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              {side.label}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center">
        {/* Group 4 — history */}
        <IconButton label="Undo" shortcut="⌘Z" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={15} aria-hidden="true" />
        </IconButton>
        <IconButton label="Redo" shortcut="⌘⇧Z" onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={15} aria-hidden="true" />
        </IconButton>

        <Divider />

        {/* Group 5 — output. Three tiers: tertiary / secondary / primary. */}
        <button
          type="button"
          onClick={onSave}
          disabled={isPersisting}
          className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-ink-500 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-50"
        >
          {isPersisting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
          Save
        </button>
        <button
          type="button"
          onClick={onPreview}
          className="ml-1 flex h-8 items-center gap-2 rounded-lg bg-ink-100 px-3 text-xs font-medium text-ink-800 transition-colors duration-150 hover:bg-ink-200"
        >
          <Eye size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Preview</span>
        </button>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={isExporting}
          className="ml-2 flex h-8 items-center gap-2 rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white shadow-panel transition-all duration-150 hover:bg-brand-600 hover:shadow-raised disabled:opacity-60 disabled:shadow-none"
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
