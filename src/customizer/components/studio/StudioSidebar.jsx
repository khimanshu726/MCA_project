import { memo } from "react";
import {
  Image as ImageIcon,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Palette,
  Shapes,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react";
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
 * Tool navigation — labelled, not an icon rail.
 *
 * An icon-only rail needs tooltips, and a tooltip on a left-edge rail has
 * nowhere to go but rightwards, over the canvas. No positioning strategy
 * fixes that: the label has to render somewhere, and the only region to
 * the right IS the workspace. Showing labels inline deletes the overlay
 * class outright — the navigation describes itself, nothing floats, and
 * the canvas is never covered.
 *
 * It also gives the onboarding quick-actions a home, which previously
 * floated over the printable area.
 */
export const StudioRail = memo(function StudioRail({
  activePanel,
  onPanelChange,
  showQuickActions,
  onUpload,
  onAddText,
  onBrowseTemplates,
  onDismissQuickActions,
}) {
  const quickActions = [
    { id: "qa-upload", label: "Upload artwork", Icon: ImagePlus, onClick: onUpload },
    { id: "qa-text", label: "Add text", Icon: Type, onClick: onAddText },
    { id: "qa-templates", label: "Browse layouts", Icon: LayoutTemplate, onClick: onBrowseTemplates },
  ];

  return (
    <div className="scrollbar-thin flex h-full w-full min-w-0 flex-row items-center gap-1 overflow-x-auto px-2 lg:w-44 lg:shrink-0 lg:flex-col lg:items-stretch lg:overflow-y-auto lg:overflow-x-hidden lg:py-3">
      <nav aria-label="Studio tools" className="flex shrink-0 flex-row gap-1 lg:flex-col">
        {RAIL_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activePanel === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              aria-label={label}
              onClick={() => onPanelChange(isActive ? null : id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors duration-150 ${
                isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              }`}
            >
              <Icon size={17} className="shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline">{label}</span>
            </button>
          );
        })}
      </nav>

      {showQuickActions ? (
        <div className="mt-3 hidden border-t border-ink-100 pt-3 lg:flex lg:flex-col lg:gap-1">
          <div className="flex items-center justify-between gap-2 px-2.5 pb-1">
            <StudioHeading level={3} className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Start
            </StudioHeading>
            <button
              type="button"
              onClick={onDismissQuickActions}
              aria-label="Dismiss quick actions"
              className="flex size-5 items-center justify-center rounded text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
          {quickActions.map(({ id, label, Icon, onClick }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ink-600 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900"
            >
              <Icon
                size={15}
                className="shrink-0 text-ink-400 transition-colors group-hover:text-brand-500"
                aria-hidden="true"
              />
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
