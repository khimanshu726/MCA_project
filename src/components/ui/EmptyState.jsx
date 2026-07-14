function EmptyState({ icon: Icon, title, description, action, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-bone-100/60 px-6 py-14 text-center ${className}`.trim()}
    >
      {Icon ? (
        <span className="flex size-14 items-center justify-center rounded-full bg-white text-brand-500 shadow-xs">
          <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="font-display text-xl text-ink-900">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
