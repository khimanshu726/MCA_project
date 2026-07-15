import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Renders a template option with the control its data actually fits, rather
 * than forcing one control everywhere.
 *
 * A segmented control can't hold ["350 GSM Matte", "350 GSM Gloss",
 * "Textured Ivory"] in a 288px panel — that's ~96px per segment. So:
 *   - short binary/ternary  -> segmented   (Corners: Square | Rounded)
 *   - 4-6 short values      -> chip row    (Size: S M L XL XXL)
 *   - anything longer       -> listbox     (Paper, Binding, Cover finish)
 *   - colour-ish option ids -> swatches
 */

const COLOR_HEXES = {
  white: "#ffffff",
  black: "#17181b",
  red: "#b23a2b",
  navy: "#26334d",
  sand: "#d9c9a8",
  ivory: "#f3efe7",
  kraft: "#c8a97e",
};

const isColorOption = (option) => /colou?r/i.test(option.id);
const longest = (values) => values.reduce((max, value) => Math.max(max, value.length), 0);

function Swatches({ option, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {option.values.map((entry) => {
        const hex = COLOR_HEXES[entry.toLowerCase()] || "#e4e5e7";
        const isActive = value === entry;
        return (
          <button
            key={entry}
            type="button"
            title={entry}
            aria-label={entry}
            aria-pressed={isActive}
            onClick={() => onChange(option.id, entry)}
            className={`flex size-7 items-center justify-center rounded-lg border transition ${
              isActive ? "border-ink-900 ring-2 ring-ink-900/15" : "border-ink-200 hover:border-ink-400"
            }`}
            style={{ background: hex }}
          >
            {isActive ? (
              <Check size={12} className={entry.toLowerCase() === "black" ? "text-white" : "text-ink-900"} aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Segmented({ option, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={option.label} className="flex rounded-lg bg-ink-100 p-0.5">
      {option.values.map((entry) => {
        const isActive = value === entry;
        return (
          <button
            key={entry}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.id, entry)}
            className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
              isActive ? "bg-white text-ink-900 shadow-panel" : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {entry}
          </button>
        );
      })}
    </div>
  );
}

function Chips({ option, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={option.label} className="flex flex-wrap gap-2">
      {option.values.map((entry) => {
        const isActive = value === entry;
        return (
          <button
            key={entry}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.id, entry)}
            className={`min-w-9 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive ? "bg-ink-900 text-white" : "bg-white text-ink-600 hover:text-ink-900"
            }`}
          >
            {entry}
          </button>
        );
      })}
    </div>
  );
}

function Listbox({ option, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-ink-50"
      >
        <span className="truncate font-medium text-ink-900">{value}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-ink-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={option.label}
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl bg-white py-1 shadow-overlay"
        >
          {option.values.map((entry) => {
            const isActive = value === entry;
            return (
              <li key={entry}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(option.id, entry);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-ink-50 ${
                    isActive ? "font-medium text-ink-900" : "text-ink-600"
                  }`}
                >
                  <span className="truncate">{entry}</span>
                  {isActive ? <Check size={12} className="shrink-0 text-brand-500" aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OptionField({ option, value, onChange }) {
  let Control = Listbox;
  if (isColorOption(option)) {
    Control = Swatches;
  } else if (option.values.length <= 3 && longest(option.values) <= 8) {
    Control = Segmented;
  } else if (option.values.length <= 6 && longest(option.values) <= 4) {
    Control = Chips;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ink-500">{option.label}</span>
      <Control option={option} value={value} onChange={onChange} />
    </div>
  );
}

export default OptionField;
