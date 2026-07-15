import { Crop, FlipHorizontal2, FlipVertical2, RotateCw } from "lucide-react";
import ArrangeSection from "./ArrangeSection.jsx";
import PropertyCard from "./PropertyCard.jsx";
import ImagePanel from "../ImagePanel.jsx";
import QualityBadge from "../QualityBadge.jsx";

const ToolButton = ({ label, onClick, disabled, active, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={`flex size-8 items-center justify-center rounded-lg bg-white text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-40 ${
      active ? "bg-ink-900 text-white hover:text-white" : ""
    }`}
  >
    {children}
  </button>
);

const Section = PropertyCard;

/** Inspector context for a selected image layer. */
function ImageContext({ layer, template, actions, onReplaceImage }) {
  const disabled = layer.locked;

  return (
    <div className="flex flex-col gap-3">
      <QualityBadge layer={layer} template={template} />

      <Section title="Transform">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolButton label="Crop" disabled={disabled} onClick={() => actions.setCropMode(layer.id)}>
            <Crop size={14} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Rotate 90°"
            disabled={disabled}
            onClick={() => actions.updateLayer(layer.id, { rotation: ((layer.rotation || 0) + 90) % 360 })}
          >
            <RotateCw size={14} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Flip horizontal"
            disabled={disabled}
            active={layer.flipH}
            onClick={() => actions.updateLayer(layer.id, { flipH: !layer.flipH })}
          >
            <FlipHorizontal2 size={14} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Flip vertical"
            disabled={disabled}
            active={layer.flipV}
            onClick={() => actions.updateLayer(layer.id, { flipV: !layer.flipV })}
          >
            <FlipVertical2 size={14} aria-hidden="true" />
          </ToolButton>
          <button
            type="button"
            disabled={disabled}
            onClick={onReplaceImage}
            className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:text-ink-900 disabled:opacity-40"
          >
            Replace
          </button>
        </div>
      </Section>

      <Section title="Adjust">
        <ImagePanel selectedLayer={layer} actions={actions} />
      </Section>

      <Section title="Shadow">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(layer.shadow)}
            disabled={disabled}
            aria-label="Toggle image shadow"
            onChange={(event) =>
              actions.updateLayer(layer.id, {
                shadow: event.target.checked ? { x: 0.6, y: 0.8, blur: 1.6, color: "rgba(23,24,27,0.35)" } : null,
              })
            }
            className="size-4 accent-brand-500"
          />
          <span className="text-xs text-ink-600">Soft drop shadow</span>
        </div>
      </Section>

      <Section title="Border">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="3"
            step="0.25"
            value={layer.border?.width || 0}
            disabled={disabled}
            aria-label="Border width"
            onPointerDown={() => actions.beginTransaction()}
            onChange={(event) => {
              const width = Number(event.target.value);
              actions.updateLayer(
                layer.id,
                { border: width > 0 ? { width, color: layer.border?.color || "#17181b" } : null },
                { transient: true },
              );
            }}
            onPointerUp={() => actions.endTransaction()}
            className="min-w-0 flex-1 accent-brand-500"
          />
          <input
            type="color"
            value={layer.border?.color || "#17181b"}
            disabled={disabled || !layer.border?.width}
            aria-label="Border colour"
            onChange={(event) =>
              actions.updateLayer(layer.id, { border: { width: layer.border?.width || 0.5, color: event.target.value } })
            }
            className="size-6 cursor-pointer rounded-lg border border-ink-200"
          />
        </div>
      </Section>

      <Section title="Reset">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            actions.updateLayer(layer.id, {
              rotation: 0,
              flipH: false,
              flipV: false,
              opacity: 1,
              crop: { x: 0, y: 0, width: 1, height: 1 },
              filters: { brightness: 100, contrast: 100, saturation: 100 },
              shadow: null,
              border: null,
            })
          }
          className="self-start rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:text-ink-900 disabled:opacity-40"
        >
          Reset all edits
        </button>
      </Section>

      <Section title="Arrange">
        <ArrangeSection layer={layer} actions={actions} />
      </Section>
    </div>
  );
}

export default ImageContext;
