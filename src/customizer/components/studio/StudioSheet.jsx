import { X } from "lucide-react";
import StudioHeading from "./StudioHeading.jsx";

/**
 * Mobile bottom sheet — the small-screen home for both the tool drawer and
 * the inspector, since there's no room for two side panels.
 *
 * Not built on ui/Dialog: that centres its panel, caps at max-w-sm, and
 * lays a full click-to-close scrim over everything — all three wrong here.
 * The scrim is deliberately absent so the canvas stays visible and usable
 * behind the sheet.
 *
 * No drag-to-dismiss: EditorStage sets `touch-action: none` and tracks
 * pointers on window for pinch-zoom, so a vertical drag gesture here would
 * fight it. Chevron/close only until that's untangled.
 */
function StudioSheet({ open, title, onClose, children }) {
  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-14 z-40 flex justify-center px-2 pb-2">
      <div className="pointer-events-auto flex max-h-[58dvh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-overlay">
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 px-4">
          <StudioHeading level={2} className="text-sm font-semibold text-ink-900">
            {title}
          </StudioHeading>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex size-7 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

export default StudioSheet;
