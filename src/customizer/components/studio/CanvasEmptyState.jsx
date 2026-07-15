import { ImagePlus, LayoutTemplate, Type } from "lucide-react";

/**
 * Shown over the artboard while a design has no layers.
 *
 * This is why the tool drawer no longer opens by default: an always-open
 * panel cost the canvas ~256px to say "upload something", and made the
 * editor look like a sidebar with a canvas beside it. Putting the
 * invitation on the artboard makes the canvas the hero and hands that
 * width back to the workspace.
 */
function CanvasEmptyState({ onUpload, onAddText, onBrowseTemplates }) {
  const actions = [
    { id: "upload", label: "Upload artwork", Icon: ImagePlus, onClick: onUpload },
    { id: "text", label: "Add text", Icon: Type, onClick: onAddText },
    { id: "templates", label: "Browse layouts", Icon: LayoutTemplate, onClick: onBrowseTemplates },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
      <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-4 text-center motion-safe:animate-[studio-fade-in_240ms_cubic-bezier(0.22,1,0.36,1)]">
        <div>
          <span className="block text-sm font-semibold text-ink-900">Start your design</span>
          <span className="block mt-1 text-xs leading-relaxed text-ink-500">
            Drop an image anywhere on the canvas, or pick a starting point.
          </span>
        </div>

        <div className="flex flex-col gap-2 self-stretch">
          {actions.map(({ id, label, Icon, onClick }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className="group flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-left text-xs font-medium text-ink-700 shadow-panel backdrop-blur transition-all duration-150 hover:bg-white hover:text-ink-900 hover:shadow-raised"
            >
              <Icon size={15} className="shrink-0 text-ink-400 transition-colors group-hover:text-brand-500" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CanvasEmptyState;
