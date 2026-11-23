import { useEffect, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { snapQuantity } from "../../utils/productAvailability";

// `step` sells in lots (e.g. 50 from an MOQ of 100: 100, 150, 200…). The
// buttons move one lot; a typed amount snaps to the nearest allowed one.
function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  disabled = false,
  isPending = false,
  ariaLabel,
}) {
  const [draft, setDraft] = useState(String(value));
  const isDisabled = disabled || isPending;

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const highest = snapQuantity(max, { min, max, step }, "down");

  const commit = (nextValue, direction = "nearest") => {
    const clamped = snapQuantity(nextValue, { min, max, step }, direction);
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
      commit(value + step, "down");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      commit(value - step, "up");
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
        className="flex size-11 items-center justify-center rounded-l-xl text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => commit(value - step, "up")}
        disabled={isDisabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus size={15} strokeWidth={2} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        className="h-11 w-14 border-x border-ink-200 bg-transparent text-center text-sm font-semibold text-ink-900 focus:outline-none"
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
        className="flex size-11 items-center justify-center rounded-r-xl text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => commit(value + step, "down")}
        disabled={isDisabled || value >= highest}
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
