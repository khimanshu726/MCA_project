import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Tag, Truck, X } from "lucide-react";
import Button from "../ui/Button";
import { currencyFormatter } from "../ui/PriceDisplay";

function SummaryRow({ label, value, tone = "default" }) {
  const valueClass = tone === "success" ? "text-success-600" : tone === "muted" ? "text-ink-500" : "text-ink-900";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

function CouponForm({ pricing, isAuthenticated, isApplyingCoupon, onApplyCoupon, onRemoveCoupon }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-ink-200 px-3 py-2 text-sm text-ink-400">
        <Tag size={15} className="shrink-0" aria-hidden="true" />
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
        <span>to apply a coupon code.</span>
      </div>
    );
  }

  if (pricing.couponCode) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-success-100 bg-success-100/40 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-semibold text-success-600">
          <Tag size={15} aria-hidden="true" />
          {pricing.couponCode} applied
        </span>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-danger-600"
          onClick={onRemoveCoupon}
        >
          <X size={13} /> Remove
        </button>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setError("");

    try {
      await onApplyCoupon(code.trim());
      setCode("");
    } catch (submitError) {
      setError(submitError.payload?.message || submitError.message || "Unable to apply this coupon.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-ink-200 px-3 py-2">
        <Tag size={15} className="text-ink-400 shrink-0" aria-hidden="true" />
        <input
          type="text"
          placeholder="Coupon code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setError("");
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!code.trim() || isApplyingCoupon}
          className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-ink-300"
        >
          {isApplyingCoupon ? "Applying…" : "Apply"}
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-danger-600">{error}</p> : null}
    </form>
  );
}

function OrderSummaryCard({
  pricing,
  itemCount,
  onCheckout,
  canCheckout,
  checkoutDisabledReason,
  isPlacingOrder,
  isAuthenticated,
  isApplyingCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  ctaLabel = "Place order",
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <h2 className="font-display text-lg text-ink-900">Order summary</h2>
      <p className="mt-0.5 text-xs text-ink-400">
        {itemCount} item{itemCount === 1 ? "" : "s"}
      </p>

      <div className="mt-4 space-y-2">
        <SummaryRow label="Subtotal" value={currencyFormatter.format(pricing.subtotal)} />
        {pricing.discount > 0 ? (
          <SummaryRow label="Discount" value={`-${currencyFormatter.format(pricing.discount)}`} tone="success" />
        ) : null}
        {pricing.couponDiscount > 0 ? (
          <SummaryRow
            label={`Coupon (${pricing.couponCode})`}
            value={`-${currencyFormatter.format(pricing.couponDiscount)}`}
            tone="success"
          />
        ) : null}
        <SummaryRow label="Platform fee" value={currencyFormatter.format(pricing.platformFee)} tone="muted" />
        <SummaryRow label="Tax" value={currencyFormatter.format(pricing.tax)} tone="muted" />
        <SummaryRow
          label="Shipping"
          value={pricing.shipping === 0 ? "Free" : currencyFormatter.format(pricing.shipping)}
          tone={pricing.shipping === 0 ? "success" : "muted"}
        />
      </div>

      <div className="mt-4">
        <CouponForm
          pricing={pricing}
          isAuthenticated={isAuthenticated}
          isApplyingCoupon={isApplyingCoupon}
          onApplyCoupon={onApplyCoupon}
          onRemoveCoupon={onRemoveCoupon}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
        <span className="font-display text-lg text-ink-900">Total</span>
        <span className="font-display text-2xl text-ink-900">{currencyFormatter.format(pricing.total)}</span>
      </div>
      {pricing.savings > 0 ? (
        <p className="mt-1 text-right text-xs font-semibold text-success-600">
          You&rsquo;re saving {currencyFormatter.format(pricing.savings)}
        </p>
      ) : null}

      <Button className="mt-5 w-full" size="lg" onClick={onCheckout} disabled={!canCheckout} loading={isPlacingOrder}>
        {ctaLabel}
      </Button>
      {!canCheckout && checkoutDisabledReason ? (
        <p className="mt-2 text-center text-xs text-ink-400">{checkoutDisabledReason}</p>
      ) : null}
      <Link to="/products" className="mt-3 block text-center text-sm font-medium text-ink-600 hover:text-brand-600">
        Continue shopping
      </Link>

      <div className="mt-5 flex flex-col gap-2 border-t border-ink-100 pt-4 text-xs text-ink-500">
        <span className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-sage-500 shrink-0" aria-hidden="true" /> Secure checkout, encrypted
          payments
        </span>
        <span className="flex items-center gap-2">
          <Truck size={14} className="text-sage-500 shrink-0" aria-hidden="true" /> Reliable delivery with order
          tracking
        </span>
      </div>
    </div>
  );
}

export default OrderSummaryCard;
