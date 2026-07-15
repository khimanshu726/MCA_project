import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Default stays "sm" so every existing storefront dialog renders unchanged;
// the studio opts into wider ones (a print preview of a 1830mm banner in a
// 384px box is a postage stamp).
const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

function Dialog({ open, onClose, title, children, footer, size = "sm" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        className={`w-full ${SIZES[size] || SIZES.sm} rounded-2xl bg-white p-5 shadow-xl outline-none`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 id="dialog-title" className="font-display text-lg text-ink-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className="text-sm text-ink-600">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Dialog;
