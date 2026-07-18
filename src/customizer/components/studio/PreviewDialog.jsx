import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Dialog from "../../../components/ui/Dialog.jsx";
import { renderSideToCanvas } from "../../engine/exportDesign.js";

/**
 * Flattened preview: each side rendered by the same exporter that
 * produces the print file (no guides, no selection chrome) — what the
 * customer sees is what production receives.
 */
function PreviewDialog({ open, onClose, design, template }) {
  const [previews, setPreviews] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setPreviews(null);
      setError("");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const rendered = [];
        for (const side of template.sides) {
          if (!design.sides[side.id]) {
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          const { canvas } = await renderSideToCanvas(design, side.id, template, { dpi: 60 });
          rendered.push({ id: side.id, label: side.label, dataUrl: canvas.toDataURL("image/jpeg", 0.9) });
        }
        if (!cancelled) {
          setPreviews(rendered);
        }
      } catch {
        if (!cancelled) {
          setError("Couldn't render the preview — an image layer may have failed to load.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, design, template]);

  // `size="lg"` is load-bearing, not decoration. Dialog defaults to max-w-sm
  // (384px) — a sensible default for a confirm prompt and useless here: this
  // renders a print artboard, and a 6ft banner shown in a 384px box tells the
  // customer nothing about the thing they are about to pay to have printed.
  return (
    <Dialog open={open} onClose={onClose} title="Design preview" size="lg">
      {error && <span className="block text-sm text-danger-600">{error}</span>}
      {!previews && !error && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Rendering preview…
        </div>
      )}
      {previews && (
        <div className="flex flex-col gap-4">
          {previews.map((preview) => (
            <figure key={preview.id}>
              <img
                src={preview.dataUrl}
                alt={`${preview.label} preview`}
                className="w-full rounded-lg border border-ink-100 shadow-sm"
              />
              <figcaption className="mt-1.5 text-center text-xs text-ink-500">
                {preview.label} · shown without guides, exactly as it prints
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </Dialog>
  );
}

export default PreviewDialog;
