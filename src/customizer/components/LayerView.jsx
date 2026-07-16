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
    textTransform: layer.uppercase ? "uppercase" : "none",
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
    const shadowCss = layer.shadow
      ? `drop-shadow(${layer.shadow.x * scale}px ${layer.shadow.y * scale}px ${layer.shadow.blur * scale}px ${layer.shadow.color})`
      : "";

    return (
      <div style={{ width: "100%", height: "100%", filter: shadowCss || undefined }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            transform: `scale(${layer.flipH ? -1 : 1}, ${layer.flipV ? -1 : 1})`,
            border: layer.border?.width ? `${layer.border.width * scale}px solid ${layer.border.color}` : undefined,
            boxSizing: "border-box",
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
      </div>
    );
  }

  if (layer.type === "shape") {
    return <ShapeView layer={layer} scale={scale} />;
  }

  if (layer.type === "icon") {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${layer.viewBox} ${layer.viewBox}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={layer.pathData} fill={layer.fill} />
      </svg>
    );
  }

  return <div style={textLayerStyle(layer, scale)}>{layer.text}</div>;
}

function ShapeView({ layer, scale }) {
  const w = layer.width * scale;
  const h = layer.height * scale;
  const strokePx = (layer.strokeWidth || 0) * scale;
  const inset = strokePx / 2;
  const common = {
    fill: layer.fill,
    stroke: strokePx > 0 ? layer.stroke : "none",
    strokeWidth: strokePx,
  };

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {layer.kind === "ellipse" && (
        <ellipse cx={w / 2} cy={h / 2} rx={Math.max(w / 2 - inset, 0)} ry={Math.max(h / 2 - inset, 0)} {...common} />
      )}
      {layer.kind === "triangle" && (
        <polygon points={`${w / 2},${inset} ${w - inset},${h - inset} ${inset},${h - inset}`} {...common} />
      )}
      {layer.kind === "line" && (
        <rect x={0} y={0} width={w} height={h} fill={layer.fill} />
      )}
      {(layer.kind === "rect" || !["ellipse", "triangle", "line"].includes(layer.kind)) && (
        <rect
          x={inset}
          y={inset}
          width={Math.max(w - strokePx, 0)}
          height={Math.max(h - strokePx, 0)}
          rx={(layer.cornerRadius || 0) * scale}
          {...common}
        />
      )}
    </svg>
  );
}

export default memo(LayerView);
