import { memo } from "react";
import { measureTextLayerHeight } from "../../engine/textMetrics.js";
import { createTextLayer } from "../../state/editorReducer.js";

const PRESETS = [
  { id: "heading", label: "Add a heading", text: "Heading", sizeFactor: 1.6, weight: 700, font: "Fraunces" },
  { id: "subheading", label: "Add a subheading", text: "Subheading", sizeFactor: 1.0, weight: 600, font: "Inter" },
  { id: "body", label: "Add body text", text: "A little body text", sizeFactor: 0.6, weight: 400, font: "Inter" },
];

/** Left-rail Text panel: preset-sized text layer entry points. */
function TextAddPanel({ template, actions }) {
  const addPreset = (preset) => {
    const layer = createTextLayer({ template, text: preset.text, name: preset.label.replace("Add a ", "").replace("Add ", "") });
    layer.fontSize = layer.fontSize * preset.sizeFactor;
    layer.fontWeight = preset.weight;
    layer.fontFamily = preset.font;
    layer.height = measureTextLayerHeight(layer);
    actions.addLayer(layer);
  };

  return (
    <div className="flex flex-col gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => addPreset(preset)}
          className="rounded-xl bg-ink-50 px-3 py-3 text-left transition-colors hover:bg-ink-100"
        >
          <span
            className="block text-ink-900"
            style={{
              fontFamily: `"${preset.font}", sans-serif`,
              fontWeight: preset.weight,
              fontSize: 15 * preset.sizeFactor,
            }}
          >
            {preset.label}
          </span>
        </button>
      ))}
      <p className="text-xs leading-relaxed text-ink-400">Double-click any text on the canvas to edit it in place.</p>
    </div>
  );
}

export default memo(TextAddPanel);
