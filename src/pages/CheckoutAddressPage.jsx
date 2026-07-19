import { useCallback, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AddressManager from "../components/AddressManager";
import Button from "../components/ui/Button";
import { currencyFormatter } from "../components/ui/PriceDisplay";
import CheckoutProgress from "../components/checkout/CheckoutProgress";
import { useCheckout } from "../context/CheckoutContext";
import { useCheckoutSource } from "../hooks/useCheckoutSource";
import { useUserAuth } from "../context/UserAuthContext";

function CheckoutAddressPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUserAuth();
  const { items, pricing, isLoading, isBuyNow, emptyRedirect } = useCheckoutSource();
  const { addressState, setAddressState } = useCheckout();

  const activeItems = useMemo(() => items.filter((item) => !item.savedForLater), [items]);
  const purchasableCount = useMemo(
    () => activeItems.filter((item) => !item.isOutOfStock && !item.isMissing).length,
    [activeItems],
  );

  const handleAddressChange = useCallback((next) => setAddressState(next), [setAddressState]);

  // Checked against the raw (not-yet-enriched) item count, not
  // purchasableCount: on a hard refresh/direct nav, the live product data
  // that flags isOutOfStock/isMissing hasn't loaded yet, so purchasableCount
  // is transiently 0 even when the cart genuinely has items — that raced
  // this guard into bouncing straight back to /cart. The same race applies to
  // a Buy Now session, whose product is fetched on mount.
  if (!isLoading && activeItems.length === 0) {
    return <Navigate to={emptyRedirect} replace />;
  }

  const canContinue = Boolean(addressState.effectiveAddress) && !addressState.hasErrors;

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="mb-6">
          <CheckoutProgress currentStep={2} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Step 2 of 4</p>
              <h2 className="mt-1 font-display text-2xl text-ink-900">Where should we deliver this order?</h2>
            </div>

            <AddressManager
              user={user}
              isAuthenticated={isAuthenticated}
              onAddressChange={handleAddressChange}
              onOrderMessage={() => undefined}
            />
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <h2 className="font-display text-lg text-ink-900">Order summary</h2>
              <p className="mt-0.5 text-xs text-ink-400">
                {isBuyNow ? "Buying now · " : ""}
                {purchasableCount} item{purchasableCount === 1 ? "" : "s"}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
                <span className="font-display text-lg text-ink-900">Total</span>
                <span className="font-display text-2xl text-ink-900">{currencyFormatter.format(pricing.total)}</span>
              </div>

              <Button
                className="mt-5 w-full"
                size="lg"
                disabled={!canContinue}
                onClick={() => navigate("/checkout/review")}
              >
                Continue to Review
              </Button>
              {!canContinue ? (
                <p className="mt-2 text-center text-xs text-ink-400">Select or add a delivery address to continue.</p>
              ) : null}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default CheckoutAddressPage;
