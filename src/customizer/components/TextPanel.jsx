import { AlignCenter, AlignLeft, AlignRight, Bold, CaseUpper, Italic, Underline } from "lucide-react";
import { FONT_OPTIONS, GRADIENT_PRESETS, TEXT_COLOR_SWATCHES } from "../fonts.js";
import { measureTextLayerHeight } from "../engine/textMetrics.js";

const ToggleButton = ({ label, active, onClick, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
      active ? "bg-ink-900 text-white" : "bg-white text-ink-600 hover:text-ink-900"
    }`}
  >
    {children}
  </button>
);

const FieldLabel = ({ children }) => (
  <span className="text-xs font-medium text-ink-500">{children}</span>
);

/**
 * Full styling controls for the selected text layer. Every content/metric
 * change re-measures the layer's auto height so DOM and print render stay
 * in lockstep. Adding text lives in the left rail's Text panel.
 */
function TextPanel({ selectedLayer, actions }) {
  const textLayer = selectedLayer?.type === "text" ? selectedLayer : null;

  const updateText = (patch, options = {}) => {
    if (!textLayer) {
      return;
    }
    const merged = { ...textLayer, ...patch };
    const heightAffecting = ["text", "fontFamily", "fontSize", "fontWeight", "italic", "letterSpacing", "lineHeight", "uppercase"];
    if (heightAffecting.some((key) => key in patch)) {
      patch.height = measureTextLayerHeight(merged);
    }
    actions.updateLayer(textLayer.id, patch, options);
  };

  return (
    <div className="flex flex-col gap-3">
      {textLayer && (
        <div className="flex flex-col gap-3 rounded-xl bg-ink-50 p-3">
          <label className="flex flex-col gap-1">
            <FieldLabel>Content</FieldLabel>
            <textarea
              value={textLayer.text}
              rows={2}
              onChange={(event) => updateText({ text: event.target.value })}
              // styles.css sets `textarea { min-height: 120px }` unlayered,
              // which outranks any utility; inline wins so the field can be
              // two rows in a 256px inspector.
              style={{ minHeight: 0 }}
              className="rounded-lg bg-white px-2 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <FieldLabel>Font</FieldLabel>
              <select
                value={textLayer.fontFamily}
                onChange={(event) => updateText({ fontFamily: event.target.value })}
                className="rounded-lg bg-white px-2 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <FieldLabel>Size (mm)</FieldLabel>
              <input
                type="number"
                min="2"
                max="200"
                step="0.5"
                value={Number(textLayer.fontSize.toFixed(1))}
                onChange={(event) => updateText({ fontSize: Math.max(2, Number(event.target.value) || 2) })}
                className="rounded-lg bg-white px-2 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToggleButton label="Bold" active={textLayer.fontWeight >= 600} onClick={() => updateText({ fontWeight: textLayer.fontWeight >= 600 ? 400 : 700 })}>
              <Bold size={14} aria-hidden="true" />
            </ToggleButton>
            <ToggleButton label="Italic" active={textLayer.italic} onClick={() => updateText({ italic: !textLayer.italic })}>
              <Italic size={14} aria-hidden="true" />
            </ToggleButton>
            <ToggleButton label="Underline" active={textLayer.underline} onClick={() => updateText({ underline: !textLayer.underline })}>
              <Underline size={14} aria-hidden="true" />
            </ToggleButton>
            <ToggleButton label="Uppercase" active={textLayer.uppercase} onClick={() => updateText({ uppercase: !textLayer.uppercase })}>
              <CaseUpper size={14} aria-hidden="true" />
            </ToggleButton>
            <span className="mx-1 h-5 w-px bg-ink-100" aria-hidden="true" />
            <ToggleButton label="Align left" active={textLayer.align === "left"} onClick={() => updateText({ align: "left" })}>
              <AlignLeft size={14} aria-hidden="true" />
            </ToggleButton>
            <ToggleButton label="Align center" active={textLayer.align === "center"} onClick={() => updateText({ align: "center" })}>
              <AlignCenter size={14} aria-hidden="true" />
            </ToggleButton>
            <ToggleButton label="Align right" active={textLayer.align === "right"} onClick={() => updateText({ align: "right" })}>
              <AlignRight size={14} aria-hidden="true" />
            </ToggleButton>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <FieldLabel>Letter spacing</FieldLabel>
              <input
                type="range"
                min="-0.05"
                max="0.5"
                step="0.01"
                value={textLayer.letterSpacing || 0}
                onPointerDown={() => actions.beginTransaction()}
                onChange={(event) => updateText({ letterSpacing: Number(event.target.value) }, { transient: true })}
                onPointerUp={() => actions.endTransaction()}
                className="accent-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <FieldLabel>Line spacing</FieldLabel>
              <input
                type="range"
                min="0.9"
                max="2.5"
                step="0.05"
                value={textLayer.lineHeight || 1.25}
                onPointerDown={() => actions.beginTransaction()}
                onChange={(event) => updateText({ lineHeight: Number(event.target.value) }, { transient: true })}
                onPointerUp={() => actions.endTransaction()}
                className="accent-brand-500"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel>Colour</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              {TEXT_COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Text colour ${swatch}`}
                  onClick={() => updateText({ color: swatch, gradient: null })}
                  className={`size-6 rounded-lg border ${
                    textLayer.color === swatch && !textLayer.gradient ? "border-brand-500 ring-2 ring-brand-400/40" : "border-ink-200"
                  }`}
                  style={{ background: swatch }}
                />
              ))}
              <input
                type="color"
                value={textLayer.color}
                aria-label="Custom text colour"
                onChange={(event) => updateText({ color: event.target.value, gradient: null })}
                className="size-6 cursor-pointer rounded-lg border border-ink-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel>Gradient</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  aria-label={`Gradient ${preset.label}`}
                  onClick={() => updateText({ gradient: { from: preset.value, to: preset.value2, angle: preset.angle } })}
                  className={`h-6 w-10 rounded-lg border ${
                    textLayer.gradient?.from === preset.value ? "border-brand-500 ring-2 ring-brand-400/40" : "border-ink-200"
                  }`}
                  style={{ background: `linear-gradient(${preset.angle}deg, ${preset.value}, ${preset.value2})` }}
                />
              ))}
              {textLayer.gradient && (
                <button
                  type="button"
                  onClick={() => updateText({ gradient: null })}
                  className="rounded-lg bg-white px-2 text-xs text-ink-600 transition-colors hover:text-ink-900"
                >
                  None
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <FieldLabel>Outline</FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={textLayer.strokeWidth || 0}
                  onPointerDown={() => actions.beginTransaction()}
                  onChange={(event) => updateText({ strokeWidth: Number(event.target.value) }, { transient: true })}
                  onPointerUp={() => actions.endTransaction()}
                  className="min-w-0 flex-1 accent-brand-500"
                />
                <input
                  type="color"
                  value={textLayer.strokeColor}
                  aria-label="Outline colour"
                  onChange={(event) => updateText({ strokeColor: event.target.value })}
                  className="size-6 cursor-pointer rounded-lg border border-ink-200"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <FieldLabel>Shadow</FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(textLayer.shadow)}
                  aria-label="Toggle text shadow"
                  onChange={(event) =>
                    updateText({
                      shadow: event.target.checked ? { x: 0.4, y: 0.4, blur: 0.8, color: "rgba(23,24,27,0.45)" } : null,
                    })
                  }
                  className="size-4 accent-brand-500"
                />
                <span className="text-xs text-ink-600">Soft shadow</span>
              </div>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <FieldLabel>Rotation (°)</FieldLabel>
            <input
              type="number"
              min="-360"
              max="360"
              step="1"
              value={Math.round(textLayer.rotation || 0)}
              onChange={(event) => updateText({ rotation: ((Number(event.target.value) || 0) % 360 + 360) % 360 })}
              className="w-24 rounded-xl border border-ink-200 px-2 py-1.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export default TextPanel;
