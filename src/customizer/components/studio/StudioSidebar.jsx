import { memo } from "react";
import { Image as ImageIcon, Layers, LayoutTemplate, Palette, Shapes, Sparkles, Type, Upload, X } from "lucide-react";
import UploadsPanel from "./UploadsPanel.jsx";
import BackgroundPanel from "../BackgroundPanel.jsx";
import LayersPanel from "../LayersPanel.jsx";
import TextAddPanel from "./TextAddPanel.jsx";
import ShapesPanel from "./ShapesPanel.jsx";
import GraphicsPanel from "./GraphicsPanel.jsx";
import StartersPanel from "./StartersPanel.jsx";
import MyDesignsPanel from "./MyDesignsPanel.jsx";

export const RAIL_ITEMS = [
  { id: "uploads", label: "Uploads", Icon: Upload },
  { id: "text", label: "Text", Icon: Type },
  { id: "shapes", label: "Shapes", Icon: Shapes },
  { id: "graphics", label: "Graphics", Icon: Sparkles },
  { id: "starters", label: "Templates", Icon: LayoutTemplate },
  { id: "background", label: "Background", Icon: ImageIcon },
  { id: "designs", label: "My Designs", Icon: Palette },
  { id: "layers", label: "Layers", Icon: Layers },
];

/**
 * Content tools. The rail is icons-only; clicking opens a drawer beside it
 * and clicking the active item closes it, so the canvas can have the room.
 *
 * Active state is neutral (ink), not brand-tinted: terracotta is reserved
 * for selection on the canvas and the primary action, so a tinted nav item
 * would compete for the same signal.
 */
export const StudioRail = memo(function StudioRail({ activePanel, onPanelChange }) {
  return (
    // Shrinks and scrolls as a horizontal bar on mobile — `shrink-0` there
    // would push the last four tools past the shell's clipped edge, making
    // them unreachable — but holds its width as a column from lg up.
    <nav
      aria-label="Studio tools"
      className="flex h-full w-full min-w-0 flex-row items-center gap-1 overflow-x-auto px-2 lg:w-16 lg:shrink-0 lg:flex-col lg:items-stretch lg:overflow-visible lg:py-2"
    >
      {RAIL_ITEMS.map(({ id, label, Icon }) => {
        const isActive = activePanel === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            title={label}
            onClick={() => onPanelChange(isActive ? null : id)}
            className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors lg:w-full ${
              isActive ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:bg-ink-50 hover:text-ink-800"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </nav>
  );
});

/**
 * The drawer body. Takes only what each panel needs — notably `background`
 * and `layers` rather than the whole `activeSide`, whose identity churns on
 * every pointermove of a drag and would defeat memoisation here.
 */
export const StudioPanel = memo(function StudioPanel({
  activePanel,
  onClose,
  template,
  productName,
  actions,
  background,
  layers,
  selectedLayerId,
  onImagesReady,
  isAddingImage,
  recentUploads,
  onReuseUpload,
  bare = false,
}) {
  if (!activePanel) {
    return null;
  }

  const item = RAIL_ITEMS.find((entry) => entry.id === activePanel);

  const body = (() => {
    switch (activePanel) {
      case "uploads":
        return (
          <UploadsPanel
            onImagesReady={onImagesReady}
            isBusy={isAddingImage}
            recentUploads={recentUploads}
            onReuseUpload={onReuseUpload}
          />
        );
      case "text":
        return <TextAddPanel template={template} actions={actions} />;
      case "shapes":
        return <ShapesPanel template={template} actions={actions} />;
      case "graphics":
        return <GraphicsPanel template={template} actions={actions} />;
      case "starters":
        return <StartersPanel template={template} productName={productName} actions={actions} />;
      case "background":
        return <BackgroundPanel background={background} actions={actions} />;
      case "designs":
        return <MyDesignsPanel />;
      case "layers":
        return <LayersPanel layers={layers} selectedLayerId={selectedLayerId} actions={actions} />;
      default:
        return null;
    }
  })();

  if (bare) {
    return body;
  }

  return (
    <div className="flex h-full w-64 min-h-0 flex-col border-l border-ink-100 bg-white">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 px-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{item?.label}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex size-6 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{body}</div>
    </div>
  );
});
