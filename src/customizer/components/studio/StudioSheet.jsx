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
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-2 pb-2"
      // Sit just above the mobile tool bar, whose height includes the bottom
      // safe-area inset (see StudioShell).
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto flex max-h-[62dvh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-overlay">
        {/* Grab-handle affordance. Not yet draggable (see note above), but it
            signals the sheet is dismissible and reads as a mobile sheet. */}
        <div className="flex h-4 shrink-0 items-center justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-ink-200" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1">
          <StudioHeading level={2} className="text-sm font-semibold text-ink-900">
            {title}
          </StudioHeading>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="-mr-1.5 flex size-11 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

export default StudioSheet;
