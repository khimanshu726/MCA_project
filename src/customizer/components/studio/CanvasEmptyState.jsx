import { ImagePlus, LayoutTemplate, Type, X } from "lucide-react";

/**
 * First-run prompt for an empty design.
 *
 * Deliberately a compact, fixed-size bar pinned to the bottom of the
 * workspace rather than a block centred on the artboard. Centred, it
 * dominated a business card and looked lost on a banner, and at some zooms
 * it collided with the rulers — its size can't key off the artboard,
 * because the artboard's on-screen size varies ~20x across products.
 *
 * Sitting in the workspace gutter keeps it clear of both the artboard and
 * the rulers, and it dismisses on first use.
 */
function CanvasEmptyState({ onUpload, onAddText, onBrowseTemplates, onDismiss }) {
  const actions = [
    { id: "upload", label: "Upload artwork", Icon: ImagePlus, onClick: onUpload },
    { id: "text", label: "Add text", Icon: Type, onClick: onAddText },
    { id: "templates", label: "Layouts", Icon: LayoutTemplate, onClick: onBrowseTemplates },
  ];

  return (
    // bottom-16 stacks it above the view-control cluster (bottom-4), which
    // it would otherwise collide with once a tool drawer narrows the canvas.
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-white/95 p-1.5 shadow-overlay backdrop-blur motion-safe:animate-[studio-fade-in_240ms_cubic-bezier(0.22,1,0.36,1)]">
        <span className="shrink-0 px-2 text-xs text-ink-400">Start with</span>

        {actions.map(({ id, label, Icon, onClick }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            className="group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-700 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900"
          >
            <Icon
              size={14}
              className="shrink-0 text-ink-400 transition-colors group-hover:text-brand-500"
              aria-hidden="true"
            />
            {label}
          </button>
        ))}

        <span className="mx-0.5 h-5 w-px shrink-0 bg-ink-100" aria-hidden="true" />

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex size-6 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default CanvasEmptyState;
