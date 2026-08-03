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

/**
 * A tiny visual of each layout, drawn to the product's real aspect ratio so a
 * business card reads wide and a banner tall. Representative blocks only — the
 * real content is applied as editable layers on click.
 */
function StarterThumb({ id, aspect }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg bg-white shadow-panel ring-1 ring-ink-100"
      style={{ aspectRatio: aspect }}
    >
      {id === "bold-headline" ? (
        <div className="absolute inset-0 grid place-items-center p-2">
          <div className="h-[16%] min-h-[4px] w-3/4 rounded-sm bg-ink-800" />
        </div>
      ) : null}

      {id === "headline-subline" ? (
        <div className="absolute inset-0 grid place-items-center p-2">
          <div className="flex w-3/4 flex-col items-center gap-[8%]">
            <div className="h-[14%] min-h-[4px] w-full rounded-sm bg-ink-800" />
            <div className="h-[9%] min-h-[3px] w-2/3 rounded-sm bg-ink-300" />
          </div>
        </div>
      ) : null}

      {id === "accent-band" ? (
        <>
          <div className="absolute inset-x-0 bottom-0 h-[32%] bg-brand-500" />
          <div className="absolute inset-x-0 bottom-[11%] mx-auto h-[11%] min-h-[3px] w-2/3 rounded-sm bg-white" />
        </>
      ) : null}
    </div>
  );
}

function StartersPanel({ template, productName, actions }) {
  const starters = buildStarters(template, productName);
  const aspect = template?.trim ? `${template.trim.width} / ${template.trim.height}` : "7 / 4";

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-400">Quick layouts</p>

      <div className="grid grid-cols-2 gap-2">
        {starters.map((starter) => (
          <button
            key={starter.id}
            type="button"
            onClick={() => actions.addLayers(starter.layers())}
            className="group flex flex-col gap-1.5 rounded-xl border border-ink-100 p-1.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-raised"
          >
            <StarterThumb id={starter.id} aspect={aspect} />
            <span className="px-0.5 text-xs font-medium text-ink-800 transition-colors group-hover:text-ink-950">
              {starter.label}
            </span>
          </button>
        ))}
      </div>

      <span className="block text-xs leading-relaxed text-ink-400">
        Layouts drop editable layers onto the canvas — nothing is fixed.
      </span>
    </div>
  );
}

export default memo(StartersPanel);
