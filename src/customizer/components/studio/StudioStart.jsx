import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, Palette, Plus, Sparkles } from "lucide-react";
import { StarterThumb, buildStarters, starterAspect } from "./starters.jsx";
import { useDesigns } from "../../../hooks/useDesigns.js";

/**
 * The studio's front door. Rather than dropping people onto a blank artboard,
 * a fresh session opens here: pick a blank canvas, a quick layout, or reopen a
 * saved design. It owns no editor state — every choice hands control back to
 * DesignStudio, which then mounts the canvas with the chosen layers applied.
 *
 * Full-viewport by design (it replaces the shell until a choice is made), so
 * it carries its own slim header and scrolls independently.
 */
function StudioStart({ product, template, products = [], onBack, onSelectProduct, onBlank, onStarter }) {
  const navigate = useNavigate();
  const { designs, isLoading: isLoadingDesigns, isAuthenticated } = useDesigns();

  const starters = useMemo(() => buildStarters(template, product.name), [template, product.name]);
  const aspect = starterAspect(template);

  // Only this product's saved designs make sense here — reopening one for a
  // different product would silently switch what you're editing.
  const savedForProduct = useMemo(
    () => designs.filter((design) => design.productId === product.id),
    [designs, product.id],
  );

  return (
    <div className="flex h-dvh flex-col bg-ink-50">
      {/* Slim header — mirrors the app bar's left zone so the transition into
          the editor feels like the same room, not a different page. */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-ink-100 bg-white/80 px-3 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-600 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900"
          aria-label="Back to product"
          title="Back to product"
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
        <span className="flex items-center gap-2">
          <span className="size-6 shrink-0 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-panel" aria-hidden="true" />
          <span className="font-display text-sm text-ink-900">Elite Impressions</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-wider text-ink-400 sm:inline">Studio</span>
        </span>

        {products.length > 1 ? (
          <label className="ml-auto flex items-center gap-2 text-xs text-ink-500">
            <span className="hidden font-mono uppercase tracking-wider sm:inline">Product</span>
            <select
              value={product.id}
              onChange={(event) => onSelectProduct?.(event.target.value)}
              className="max-w-[12rem] truncate rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-900 outline-none transition-colors hover:border-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            >
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10 sm:py-14">
          {/* Intro */}
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              <Sparkles size={13} aria-hidden="true" />
              New design
            </span>
            <h1 className="text-balance font-display text-3xl leading-tight text-ink-950 sm:text-4xl">
              Start your {product.name}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-ink-500">
              Begin from a blank canvas or a ready-made layout — everything you add stays fully editable, sized to this
              product's real print dimensions.
            </p>
          </div>

          {/* Blank + quick layouts */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-400">Start from</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Blank */}
              <button
                type="button"
                onClick={onBlank}
                className="group flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-raised"
              >
                <span
                  className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-ink-200 bg-ink-50 text-ink-400 transition-colors group-hover:border-brand-300 group-hover:text-brand-500"
                  style={{ aspectRatio: aspect }}
                >
                  <Plus size={22} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-900">Blank canvas</span>
                  <span className="block text-xs text-ink-400">Full creative control</span>
                </span>
              </button>

              {/* Quick layouts */}
              {starters.map((starter) => (
                <button
                  key={starter.id}
                  type="button"
                  onClick={() => onStarter(starter)}
                  className="group flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-raised"
                >
                  <StarterThumb id={starter.id} aspect={aspect} />
                  <span>
                    <span className="block text-sm font-semibold text-ink-900 transition-colors group-hover:text-brand-600">
                      {starter.label}
                    </span>
                    <span className="block text-xs text-ink-400">Editable layers</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Saved designs for this product */}
          {isAuthenticated ? (
            <section className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Your saved {product.name} designs
                </h2>
                {savedForProduct.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate("/account/designs")}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                  >
                    Manage all
                    <ArrowRight size={12} aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              {isLoadingDesigns ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row} className="flex flex-col gap-3 rounded-2xl border border-ink-100 p-3">
                      <span className="w-full animate-pulse rounded-lg bg-ink-100" style={{ aspectRatio: aspect }} />
                      <span className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
                    </div>
                  ))}
                </div>
              ) : savedForProduct.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {savedForProduct.map((design) => (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => navigate(`/customize/${design.productId}?design=${design.id}`)}
                      className="group flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-raised"
                    >
                      <span
                        className="flex w-full items-center justify-center overflow-hidden rounded-lg bg-bone-100 text-ink-300"
                        style={{ aspectRatio: aspect }}
                      >
                        {design.previewImage ? (
                          <img src={design.previewImage} alt="" className="size-full object-contain" loading="lazy" />
                        ) : (
                          <Palette size={20} aria-hidden="true" />
                        )}
                      </span>
                      <span className="block truncate text-sm font-semibold text-ink-900">{design.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-ink-200 bg-white px-4 py-6 text-center text-xs text-ink-400">
                  No saved designs for this product yet. Anything you save in the studio will show up here.
                </p>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default StudioStart;
