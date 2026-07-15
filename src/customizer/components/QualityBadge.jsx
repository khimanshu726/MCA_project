import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { effectiveDpi, qualityLevel } from "../engine/geometry.js";

const LEVEL_STYLES = {
  good: { classes: "bg-success-100 text-success-600", Icon: CheckCircle2 },
  fair: { classes: "bg-bone-100 text-gold-500", Icon: Info },
  poor: { classes: "bg-danger-100 text-danger-600", Icon: AlertTriangle },
};

const LEVEL_COPY = {
  good: (dpi) => `Sharp print · ${dpi} DPI`,
  fair: (dpi) => `Acceptable · ${dpi} DPI — a larger image would print crisper`,
  poor: (dpi) => `Will print blurry · ${dpi} DPI — use a higher-resolution image or shrink it`,
};

/** Live print-resolution grade for the selected image layer. */
function QualityBadge({ layer, template }) {
  if (!layer || layer.type !== "image") {
    return null;
  }

  const dpi = effectiveDpi(layer);
  const level = qualityLevel(dpi, template);
  if (level === "unknown") {
    return null;
  }

  const { classes, Icon } = LEVEL_STYLES[level];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
      <Icon size={13} aria-hidden="true" />
      {LEVEL_COPY[level](dpi)}
    </span>
  );
}

export default QualityBadge;
