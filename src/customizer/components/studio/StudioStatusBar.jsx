import { memo, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronUp } from "lucide-react";

/**
 * Bottom status bar: canvas facts on the left, live print-readiness on the
 * right.
 *
 * Validation lives here rather than in the inspector on purpose — the
 * inspector only shows product context when *nothing* is selected, but
 * "your text is outside the safe area" matters most while that text IS
 * selected. This is also what replaced the body-copy paragraph that used to
 * sit under the editor, which was the most page-like artifact in the studio.
 */
function StudioStatusBar({ template, validation, layerCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];
  const issues = [...errors, ...warnings];
  const hasIssues = issues.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onPointerDown = (event) => {
      if (!popoverRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!hasIssues) {
      setIsOpen(false);
    }
  }, [hasIssues]);

  const tone = errors.length > 0 ? "danger" : warnings.length > 0 ? "gold" : "sage";
  const toneClasses = {
    danger: "text-danger-600 hover:bg-danger-100/50",
    gold: "text-gold-500 hover:bg-gold-500/10",
    sage: "text-sage-500",
  }[tone];

  const label =
    errors.length > 0
      ? `${errors.length} ${errors.length === 1 ? "error" : "errors"}`
      : warnings.length > 0
        ? `${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}`
        : "Ready to print";

  return (
    <div className="flex w-full items-center justify-between text-xs text-ink-400">
      <span className="tabular-nums">
        {template.trim.width} × {template.trim.height} mm · bleed {template.bleed} mm · {layerCount}{" "}
        {layerCount === 1 ? "layer" : "layers"}
      </span>

      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          disabled={!hasIssues}
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={hasIssues ? isOpen : undefined}
          className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium transition-colors ${toneClasses} ${
            hasIssues ? "" : "cursor-default"
          }`}
        >
          {hasIssues ? (
            <AlertTriangle size={12} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={12} aria-hidden="true" />
          )}
          {label}
          {hasIssues ? (
            <ChevronUp size={11} className={`transition-transform ${isOpen ? "" : "rotate-180"}`} aria-hidden="true" />
          ) : null}
        </button>

        {isOpen && hasIssues && (
          <div className="absolute bottom-full right-0 mb-2 w-80 rounded-2xl bg-white p-3 shadow-overlay">
            <ul className="flex flex-col gap-2">
              {issues.map((message) => (
                <li key={message} className="flex items-start gap-2 text-xs leading-relaxed text-ink-700">
                  <AlertTriangle
                    size={13}
                    className={`mt-0.5 shrink-0 ${errors.includes(message) ? "text-danger-600" : "text-gold-500"}`}
                    aria-hidden="true"
                  />
                  {message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(StudioStatusBar);
