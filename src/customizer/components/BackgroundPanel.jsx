import { memo } from "react";
import { BACKGROUND_SWATCHES, GRADIENT_PRESETS } from "../fonts.js";

/**
 * Background controls for the active side: brand-aligned solid swatches, a
 * custom colour picker, and gradient presets.
 */
function BackgroundPanel({ background, actions }) {
  const isColor = !background || background.type === "color";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink-500">Solid colour</span>
        <div className="flex flex-wrap items-center gap-2">
          {BACKGROUND_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Background ${swatch}`}
              onClick={() => actions.setBackground({ type: "color", value: swatch })}
              className={`size-7 rounded-lg border ${
                isColor && background?.value === swatch ? "border-brand-500 ring-2 ring-brand-400/40" : "border-ink-200"
              }`}
              style={{ background: swatch }}
            />
          ))}
          <input
            type="color"
            value={isColor ? background?.value || "#ffffff" : "#ffffff"}
            aria-label="Custom background colour"
            onChange={(event) => actions.setBackground({ type: "color", value: event.target.value })}
            className="size-7 cursor-pointer rounded-lg border border-ink-200"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink-500">Gradient</span>
        <div className="flex flex-wrap gap-2">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-label={`Background gradient ${preset.label}`}
              title={preset.label}
              onClick={() =>
                actions.setBackground({ type: "gradient", value: preset.value, value2: preset.value2, angle: preset.angle })
              }
              className={`h-7 w-12 rounded-lg border ${
                background?.type === "gradient" && background.value === preset.value
                  ? "border-brand-500 ring-2 ring-brand-400/40"
                  : "border-ink-200"
              }`}
              style={{ background: `linear-gradient(${preset.angle}deg, ${preset.value}, ${preset.value2})` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(BackgroundPanel);
