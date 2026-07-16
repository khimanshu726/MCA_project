import { Link, useNavigate } from "react-router-dom";
import { Palette } from "lucide-react";
import { useDesigns } from "../../../hooks/useDesigns.js";

/** Left-rail My Designs panel: reopen a saved design in place. */
function MyDesignsPanel() {
  const navigate = useNavigate();
  const { designs, isLoading, isAuthenticated } = useDesigns();

  if (!isAuthenticated) {
    return (
      <span className="block px-1 py-4 text-center text-xs text-ink-500">
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>{" "}
        to save designs and reopen them here.
      </span>
    );
  }

  if (isLoading) {
    return <span className="block px-1 py-4 text-center text-xs text-ink-500">Loading your designs…</span>;
  }

  if (designs.length === 0) {
    return <span className="block px-1 py-4 text-center text-xs text-ink-500">No saved designs yet — click "Save design" in the toolbar.</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {designs.map((design) => (
        <button
          key={design.id}
          type="button"
          onClick={() => navigate(`/customize/${design.productId}?design=${design.id}`)}
          className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white p-2 text-left transition hover:border-brand-400"
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
      <Link to="/account/designs" className="px-1 text-xs font-semibold text-brand-600 hover:underline">
        Manage all designs →
      </Link>
    </div>
  );
}

export default MyDesignsPanel;
