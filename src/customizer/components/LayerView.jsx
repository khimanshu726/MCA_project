import { memo } from "react";

/**
 * Pure DOM rendering of a single layer at a given scale (px per mm).
 * Transforms are CSS-only so dragging stays GPU-composited; the print
 * exporter reproduces this exact math on a canvas.
 */

export const layerBoxStyle = (layer, scale) => ({
  position: "absolute",
  left: (layer.x - layer.width / 2) * scale,
  top: (layer.y - layer.height / 2) * scale,
  width: layer.width * scale,
  height: layer.height * scale,
  transform: `rotate(${layer.rotation || 0}deg)`,
  opacity: layer.opacity ?? 1,
});

export const textLayerStyle = (layer, scale) => {
  const style = {
    width: "100%",
    minHeight: "100%",
    fontFamily: `"${layer.fontFamily}", sans-serif`,
    fontSize: layer.fontSize * scale,
    fontWeight: layer.fontWeight || 400,
    fontStyle: layer.italic ? "italic" : "normal",
    textDecoration: layer.underline ? "underline" : "none",
    textAlign: layer.align || "center",
    letterSpacing: `${layer.letterSpacing || 0}em`,
    lineHeight: layer.lineHeight || 1.25,
    color: layer.color,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    userSelect: "none",
  };

  if (layer.gradient) {
    style.backgroundImage = `linear-gradient(${layer.gradient.angle ?? 90}deg, ${layer.gradient.from}, ${layer.gradient.to})`;
    style.WebkitBackgroundClip = "text";
    style.backgroundClip = "text";
    style.color = "transparent";
  }

  if (layer.strokeWidth > 0) {
    style.WebkitTextStroke = `${layer.strokeWidth * scale}px ${layer.strokeColor}`;
  }

  if (layer.shadow) {
    style.textShadow = `${layer.shadow.x * scale}px ${layer.shadow.y * scale}px ${layer.shadow.blur * scale}px ${layer.shadow.color}`;
  }

  return style;
};

function LayerView({ layer, scale }) {
  if (layer.hidden) {
    return null;
  }

  if (layer.type === "image") {
    const crop = layer.crop || { x: 0, y: 0, width: 1, height: 1 };
    const filters = layer.filters || {};
    const filterCss = `brightness(${(filters.brightness ?? 100) / 100}) contrast(${(filters.contrast ?? 100) / 100}) saturate(${(filters.saturation ?? 100) / 100})`;

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          transform: `scale(${layer.flipH ? -1 : 1}, ${layer.flipV ? -1 : 1})`,
        }}
      >
        <img
          src={layer.src}
          alt={layer.name}
          draggable={false}
          style={{
            position: "absolute",
            width: `${100 / crop.width}%`,
            height: `${100 / crop.height}%`,
            left: `${-crop.x * (100 / crop.width)}%`,
            top: `${-crop.y * (100 / crop.height)}%`,
            maxWidth: "none",
            filter: filterCss,
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  return <div style={textLayerStyle(layer, scale)}>{layer.text}</div>;
}

export default memo(LayerView);
