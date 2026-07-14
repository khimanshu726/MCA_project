const TONE_CLASSES = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-700",
  danger: "bg-danger-100 text-danger-600",
  warning: "bg-gold-500/15 text-gold-500",
  success: "bg-success-100 text-success-600",
};

function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${TONE_CLASSES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

export default Badge;
