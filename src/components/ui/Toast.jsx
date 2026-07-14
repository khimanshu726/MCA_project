import { CheckCircle2, Info, XCircle } from "lucide-react";

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONE_CLASSES = {
  success: "bg-success-600 text-white",
  error: "bg-danger-600 text-white",
  info: "bg-ink-900 text-white",
};

// Tailwind-styled shell around useToast.js's push/dismiss/timer logic —
// that hook's state management is reused as-is, only this markup is new.
function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  const Icon = ICONS[toast.type] || Info;
  const toneClass = TONE_CLASSES[toast.type] || TONE_CLASSES.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${toneClass}`}
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      <span>{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          className="ml-1 rounded-md border border-white/30 px-2 py-1 text-xs font-semibold hover:bg-white/10"
          onClick={() => {
            toast.action.onClick();
            onDismiss?.();
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
    </div>
  );
}

export default Toast;
