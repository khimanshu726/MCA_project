import { useEffect, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";

function QuantitySelector({ value, onChange, min = 1, max = 99, disabled = false, isPending = false, ariaLabel }) {
  const [draft, setDraft] = useState(String(value));
  const isDisabled = disabled || isPending;

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

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      commit(value + 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      commit(value - 1);
    }
  };

  return (
    <div
      className={`relative inline-flex items-center rounded-xl border border-ink-200 bg-white ${isDisabled ? "opacity-50" : ""}`}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-l-xl text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => commit(value - 1)}
        disabled={isDisabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus size={15} strokeWidth={2} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        className="h-9 w-11 border-x border-ink-200 bg-transparent text-center text-sm font-semibold text-ink-900 focus:outline-none"
        value={draft}
        disabled={isDisabled}
        onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={handleKeyDown}
        onWheel={(event) => event.currentTarget.blur()}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-r-xl text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => commit(value + 1)}
        disabled={isDisabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus size={15} strokeWidth={2} />
      </button>
      {isPending ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
          <Loader2 size={14} className="animate-spin text-ink-500" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}

export default QuantitySelector;
