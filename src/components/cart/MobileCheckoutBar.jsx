import Button from "../ui/Button";
import { currencyFormatter } from "../ui/PriceDisplay";

/**
 * Persistent mobile-only checkout bar (Amazon-app style). Keeps "Proceed to
 * checkout" one tap away no matter how far the shopper scrolls into the
 * recommendation rails. Hidden on desktop, where the sticky order-summary rail
 * already keeps the CTA in view.
 */
function MobileCheckoutBar({ total, itemCount, canCheckout, onCheckout, disabledReason }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 px-4 pt-3 backdrop-blur lg:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs text-ink-500">
            Total ({itemCount} item{itemCount === 1 ? "" : "s"})
          </p>
          <p className="font-display text-lg leading-tight text-ink-900">{currencyFormatter.format(total)}</p>
        </div>
        <Button className="ml-auto flex-1 whitespace-nowrap" size="lg" onClick={onCheckout} disabled={!canCheckout}>
          Proceed to checkout
        </Button>
      </div>
      {!canCheckout && disabledReason ? (
        <p className="mt-1 text-center text-xs text-ink-400">{disabledReason}</p>
      ) : null}
    </div>
  );
}

export default MobileCheckoutBar;
