import { Link, useNavigate } from "react-router-dom";
import { Palette } from "lucide-react";
import { useDesigns } from "../../../hooks/useDesigns.js";

/** A centered empty / prompt state — a soft brand-tinted icon plus copy. */
function PanelEmpty({ children, cta = null }) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Palette size={20} aria-hidden="true" />
      </span>
      <p className="text-xs leading-relaxed text-ink-500">{children}</p>
      {cta}
    </div>
  );
}

/** Left-rail My Designs panel: reopen a saved design in place. */
function MyDesignsPanel() {
  const navigate = useNavigate();
  const { designs, isLoading, isAuthenticated } = useDesigns();

  if (!isAuthenticated) {
    return (
      <PanelEmpty
        cta={
          <Link
            to="/login"
            className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Log in
          </Link>
        }
      >
        Sign in to save designs and reopen them here anytime.
      </PanelEmpty>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-2 rounded-xl border border-ink-100 p-2">
            <span className="h-10 w-12 shrink-0 animate-pulse rounded-lg bg-ink-100" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="h-2.5 w-3/4 animate-pulse rounded bg-ink-100" />
              <span className="h-2 w-1/2 animate-pulse rounded bg-ink-50" />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <PanelEmpty>
        No saved designs yet. Click <span className="font-semibold text-ink-700">Save</span> in the toolbar to keep one
        here.
      </PanelEmpty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-400">Saved</p>
        <span className="font-mono text-[11px] tabular-nums text-ink-400">{designs.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {designs.map((design) => (
          <button
            key={design.id}
            type="button"
            onClick={() => navigate(`/customize/${design.productId}?design=${design.id}`)}
            className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white p-2 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-raised"
          >
            <span className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bone-100 text-ink-300">
              {design.previewImage ? (
                <img src={design.previewImage} alt="" className="size-full object-contain" loading="lazy" />
              ) : (
                <Palette size={16} aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-ink-900">{design.name}</span>
              <span className="block truncate text-xs text-ink-500">{design.productName || design.productId}</span>
            </span>
          </button>
        ))}
      </div>

      <Link to="/account/designs" className="px-1 text-xs font-semibold text-brand-600 hover:underline">
        Manage all designs →
      </Link>
    </div>
  );
}

export default MyDesignsPanel;
