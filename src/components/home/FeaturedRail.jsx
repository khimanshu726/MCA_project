import { Link } from "react-router-dom";
import ProductCard from "../ProductCard";
import RollButton from "./RollButton";
import SectionBadge from "./SectionBadge";
import { useProducts } from "../../hooks/useProducts";

/**
 * Live "Featured products" rail for the axion landing page.
 *
 * Pulls the same featured feed the catalog uses (`featured: true`) so the home
 * page reflects real inventory rather than hardcoded cards. The section chrome
 * (badge, heading, roll button) matches the surrounding axion sections; the
 * cards themselves are the canonical ProductCard, so wishlist, add-to-cart,
 * availability, and image prefetch all come along for free and stay identical
 * to /products.
 *
 * `data` — not the isLoading/isError flags — is the honest signal for which
 * state to show: absent means we never got an answer (outage → offer a retry);
 * an answer that legitimately contains nothing gets different words than a
 * network failure, so we never tell someone the store is unreachable when an
 * admin has simply unfeatured everything.
 */
function FeaturedRail() {
  const { data, isLoading, refetch, isFetching } = useProducts({ featured: true, limit: 4 });
  const products = data?.items ?? [];
  const hasAnswer = Boolean(data);
  const couldNotLoad = !isLoading && !hasAnswer;
  const answeredButEmpty = !isLoading && hasAnswer && products.length === 0;

  return (
    <section className="border-t border-ink-100 bg-white pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <SectionBadge number="2" label="Featured products" />

        <div className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-end sm:justify-between lg:mb-16">
          <h2 className="max-w-[18ch] text-[clamp(1.5rem,4vw,3.2rem)] font-medium leading-[1.12] tracking-[-0.02em] text-ink-900">
            Best-sellers, ready to reorder.
          </h2>
          <div className="hidden shrink-0 sm:block">
            <RollButton to="/products">Explore full catalog</RollButton>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4 lg:gap-7">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col gap-3">
                <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-ink-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-ink-100" />
              </div>
            ))}
          </div>
        ) : couldNotLoad ? (
          <div
            role="status"
            className="flex flex-col items-start gap-4 rounded-2xl border border-ink-100 bg-bone px-6 py-10"
          >
            <p className="max-w-[42ch] text-[15px] leading-[1.6] text-ink-700">
              We couldn&rsquo;t load featured products just now. The rest of the catalog is still available.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-[4px] bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isFetching ? "Retrying…" : "Try again"}
              </button>
              <Link to="/products" className="text-sm font-medium text-ink-700 underline-offset-4 hover:underline">
                Browse all products
              </Link>
            </div>
          </div>
        ) : answeredButEmpty ? (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-ink-100 bg-bone px-6 py-10">
            <p className="max-w-[42ch] text-[15px] leading-[1.6] text-ink-700">
              No products are featured right now — the full catalog is still open.
            </p>
            <Link to="/products" className="text-sm font-medium text-ink-700 underline-offset-4 hover:underline">
              Browse all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4 lg:gap-7">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Mobile CTA lives below the grid where a right-aligned header button
            would otherwise be cramped. */}
        <div className="mt-10 sm:hidden">
          <RollButton to="/products">Explore full catalog</RollButton>
        </div>
      </div>
    </section>
  );
}

export default FeaturedRail;
