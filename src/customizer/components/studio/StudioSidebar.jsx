import { memo } from "react";
import { Image as ImageIcon, Layers, LayoutTemplate, Palette, Shapes, Sparkles, Type, Upload, X } from "lucide-react";
import StudioTooltip from "./StudioTooltip.jsx";
import StudioHeading from "./StudioHeading.jsx";
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
 * Tool rail — icon-only with tooltips.
 *
 * It previously carried text labels under each icon in a 64px column:
 * "Background" needs 91px to render, so seven of eight labels were clipped.
 * Icons alone are legible at any width, the tooltip carries the full name,
 * and the rail drops to 56px — width the canvas gets back.
 */
export const StudioRail = memo(function StudioRail({ activePanel, onPanelChange }) {
  return (
    <nav
      aria-label="Studio tools"
      className="flex h-full w-full min-w-0 flex-row items-center gap-1 overflow-x-auto px-2 lg:w-14 lg:shrink-0 lg:flex-col lg:items-center lg:overflow-visible lg:py-3"
    >
      {RAIL_ITEMS.map(({ id, label, Icon }) => {
        const isActive = activePanel === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            aria-label={label}
            onClick={() => onPanelChange(isActive ? null : id)}
            className={`group relative flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
              isActive ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            <StudioTooltip label={label} side="right" />
          </button>
        );
      })}
    </nav>
  );
});

/**
 * The tool drawer. Takes `background` and `layers` rather than the whole
 * `activeSide`, whose identity churns on every pointermove of a drag and
 * would defeat memoisation here.
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
    <div className="flex h-full w-64 min-h-0 flex-col bg-white motion-safe:animate-[studio-panel-in_180ms_cubic-bezier(0.22,1,0.36,1)]">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
        <StudioHeading level={2} className="text-sm font-semibold text-ink-900">
          {item?.label}
        </StudioHeading>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">{body}</div>
    </div>
  );
});
