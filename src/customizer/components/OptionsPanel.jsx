/**
 * Product options defined by the template (paper, finish, size…). Choices
 * are stored in the design state and travel with the order as production
 * notes — they don't change the product's price.
 */
function OptionsPanel({ template, options, actions }) {
  if (template.options.length === 0) {
    return <p className="px-1 py-4 text-center text-xs text-ink-500">This product has no extra options.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {template.options.map((option) => (
        <div key={option.id} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{option.label}</span>
          <div role="radiogroup" aria-label={option.label} className="flex flex-wrap gap-1.5">
            {option.values.map((value) => {
              const isActive = options[option.id] === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => actions.setOption(option.id, value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-ink-200 bg-white text-ink-600 hover:border-brand-300"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default OptionsPanel;
