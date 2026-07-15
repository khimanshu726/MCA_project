import { memo } from "react";
import { getCanvasSize } from "../../templates.js";
import { measureTextLayerHeight } from "../../engine/textMetrics.js";
import { createShapeLayer, createTextLayer } from "../../state/editorReducer.js";

/**
 * Design starters: quick layout arrangements derived from the active
 * template's geometry, applied as one undoable step. Not fixed artwork —
 * everything stays editable layers.
 */
const buildStarters = (template, productName) => {
  const canvas = getCanvasSize(template);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const headline = (overrides = {}) => {
    const layer = createTextLayer({ template, text: productName || "Your headline", name: "Headline" });
    Object.assign(layer, { fontFamily: "Fraunces", fontWeight: 700, x: centerX, y: centerY }, overrides);
    layer.height = measureTextLayerHeight(layer);
    return layer;
  };

  const subline = (overrides = {}) => {
    const layer = createTextLayer({ template, text: "A short supporting line", name: "Subline" });
    Object.assign(
      layer,
      { fontSize: layer.fontSize * 0.55, x: centerX, y: centerY + layer.fontSize * 1.4 },
      overrides,
    );
    layer.height = measureTextLayerHeight(layer);
    return layer;
  };

  return [
    {
      id: "bold-headline",
      label: "Bold headline",
      layers: () => [headline({ fontSize: Math.min(template.trim.width, template.trim.height) * 0.14 })],
    },
    {
      id: "headline-subline",
      label: "Headline + subline",
      layers: () => {
        const head = headline({ y: centerY - Math.min(template.trim.width, template.trim.height) * 0.05 });
        const sub = subline({ y: head.y + head.height });
        return [head, sub];
      },
    },
    {
      id: "accent-band",
      label: "Accent band",
      layers: () => {
        const band = createShapeLayer({ template, kind: "rect", name: "Accent band" });
        Object.assign(band, {
          width: canvas.width,
          height: canvas.height * 0.28,
          x: centerX,
          y: canvas.height * 0.82,
          fill: "#b8461d",
        });
        const head = headline({ y: canvas.height * 0.82, fontWeight: 600 });
        head.color = "#ffffff";
        return [band, head];
      },
    },
  ];
};

function StartersPanel({ template, productName, actions }) {
  const starters = buildStarters(template, productName);

  return (
    <div className="flex flex-col gap-2">
      {starters.map((starter) => (
        <button
          key={starter.id}
          type="button"
          onClick={() => actions.addLayers(starter.layers())}
          className="rounded-xl bg-ink-50 px-3 py-3 text-left text-sm font-medium text-ink-800 transition-colors hover:bg-ink-100"
        >
          {starter.label}
        </button>
      ))}
      <span className="block text-xs leading-relaxed text-ink-400">Starters drop editable layers onto the canvas — nothing is fixed.</span>
    </div>
  );
}

export default memo(StartersPanel);
