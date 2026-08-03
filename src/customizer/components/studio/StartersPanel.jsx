import { memo } from "react";
import { StarterThumb, buildStarters, starterAspect } from "./starters.jsx";

function StartersPanel({ template, productName, actions }) {
  const starters = buildStarters(template, productName);
  const aspect = starterAspect(template);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-400">Quick layouts</p>

      <div className="grid grid-cols-2 gap-2">
        {starters.map((starter) => (
          <button
            key={starter.id}
            type="button"
            onClick={() => actions.addLayers(starter.layers())}
            className="group flex flex-col gap-1.5 rounded-xl border border-ink-100 p-1.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-raised"
          >
            <StarterThumb id={starter.id} aspect={aspect} />
            <span className="px-0.5 text-xs font-medium text-ink-800 transition-colors group-hover:text-ink-950">
              {starter.label}
            </span>
          </button>
        ))}
      </div>

      <span className="block text-xs leading-relaxed text-ink-400">
        Layouts drop editable layers onto the canvas — nothing is fixed.
      </span>
    </div>
  );
}

export default memo(StartersPanel);
