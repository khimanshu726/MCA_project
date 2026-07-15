import ArrangeSection from "./ArrangeSection.jsx";
import PropertyCard from "./PropertyCard.jsx";
import { TEXT_COLOR_SWATCHES } from "../../fonts.js";

const Section = PropertyCard;

/** Inspector context for shape and graphic (icon) layers. */
function ShapeContext({ layer, actions }) {
  const disabled = layer.locked;
  const isShape = layer.type === "shape";

  return (
    <div className="flex flex-col gap-3">
      <Section title="Fill">
        <div className="flex flex-wrap items-center gap-1.5">
          {TEXT_COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Fill ${swatch}`}
              disabled={disabled}
              onClick={() => actions.updateLayer(layer.id, { fill: swatch })}
              className={`size-6 rounded-lg border ${
                layer.fill === swatch ? "border-brand-500 ring-2 ring-brand-400/40" : "border-ink-200"
              }`}
              style={{ background: swatch }}
            />
          ))}
          <input
            type="color"
            value={layer.fill}
            disabled={disabled}
            aria-label="Custom fill colour"
            onChange={(event) => actions.updateLayer(layer.id, { fill: event.target.value })}
            className="size-6 cursor-pointer rounded-lg border border-ink-200"
          />
        </div>
      </Section>

      {isShape && layer.kind !== "line" && (
        <>
          <Section title="Outline">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="4"
                step="0.25"
                value={layer.strokeWidth || 0}
                disabled={disabled}
                aria-label="Outline width"
                onPointerDown={() => actions.beginTransaction()}
                onChange={(event) => actions.updateLayer(layer.id, { strokeWidth: Number(event.target.value) }, { transient: true })}
                onPointerUp={() => actions.endTransaction()}
                className="min-w-0 flex-1 accent-brand-500"
              />
              <input
                type="color"
                value={layer.stroke}
                disabled={disabled}
                aria-label="Outline colour"
                onChange={(event) => actions.updateLayer(layer.id, { stroke: event.target.value })}
                className="size-6 cursor-pointer rounded-lg border border-ink-200"
              />
            </div>
          </Section>

          {layer.kind === "rect" && (
            <Section title="Corner radius">
              <input
                type="range"
                min="0"
                max={Math.min(layer.width, layer.height) / 2}
                step="0.5"
                value={layer.cornerRadius || 0}
                disabled={disabled}
                aria-label="Corner radius"
                onPointerDown={() => actions.beginTransaction()}
                onChange={(event) => actions.updateLayer(layer.id, { cornerRadius: Number(event.target.value) }, { transient: true })}
                onPointerUp={() => actions.endTransaction()}
                className="accent-brand-500"
              />
            </Section>
          )}
        </>
      )}

      <Section title="Arrange">
        <ArrangeSection layer={layer} actions={actions} />
      </Section>
    </div>
  );
}

export default ShapeContext;
