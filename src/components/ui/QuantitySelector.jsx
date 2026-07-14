import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

function QuantitySelector({ value, onChange, min = 1, max = 99, disabled = false, ariaLabel }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (nextValue) => {
    const clamped = Math.min(max, Math.max(min, Number(nextValue) || min));
    setDraft(String(clamped));
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-ink-200 bg-white ${disabled ? "opacity-50" : ""}`}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-l-xl text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => commit(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus size={15} strokeWidth={2} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        className="h-9 w-11 border-x border-ink-200 bg-transparent text-center text-sm font-semibold text-ink-900 focus:outline-none"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-r-xl text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => commit(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus size={15} strokeWidth={2} />
      </button>
    </div>
  );
}

export default QuantitySelector;
