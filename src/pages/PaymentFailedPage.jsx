import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, RefreshCcw, XCircle } from "lucide-react";
import Button from "../components/ui/Button";
import Toast from "../components/ui/Toast";
import { currencyFormatter } from "../components/ui/PriceDisplay";
import { useCart } from "../hooks/useCart";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../hooks/useToast";
import { cancelPendingPaymentRequest } from "../api/ordersApi";
import { openRazorpayCheckout } from "../utils/razorpayCheckout";

const SUPPORT_EMAIL = "hello@elite-empressions.com";

/**
 * Terminal landing spot for an online payment that failed, was declined, or
 * was cancelled. The underlying order is still a PaymentPending reservation
 * on the server, which gives the customer two honest options:
 *  - Retry: reopen Razorpay Checkout against the SAME gateway order.
 *  - Return to checkout: release the reservation (stock goes back) and
 *    start over — e.g. to switch to Cash on Delivery.
 *
 * Arrives via router state from the checkout flow; on a hard refresh that
 * state is gone, so the page degrades to navigation-only actions.
 */
function PaymentFailedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useUserAuth();
  const { clearCart } = useCart();
  const { toast, pushToast, dismiss } = useToast();

  const [failureReason, setFailureReason] = useState(location.state?.reason || "");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const orderResponse = location.state?.orderResponse || null;
  const prefill = location.state?.prefill || {};
  const pendingOrder = orderResponse?.order || null;
  const canRetry = Boolean(pendingOrder?.razorpayOrderId);

  const handleRetry = async () => {
    if (!canRetry || isRetrying) return;
    setIsRetrying(true);

    await openRazorpayCheckout({
      orderResponse,
      prefill,
      onVerified: (order) => {
        pushToast({ type: "success", message: "Payment successful." });
        clearCart();
        navigate(`/order-success/${order.orderId}`, { replace: true, state: { order } });
      },
      onTerminalFailure: (reason) => {
        setFailureReason(reason);
        setIsRetrying(false);
      },
    });
  };

  const handleReturnToCheckout = async () => {
    if (isCancelling) return;
    setIsCancelling(true);

    if (pendingOrder?.orderId) {
      // Best-effort: release the stock reservation before restarting. If it
      // fails (e.g. the webhook confirmed payment in the meantime), checkout
      // still works — the server re-validates stock on the next order.
      await cancelPendingPaymentRequest(pendingOrder.orderId, token).catch(() => undefined);
    }

    navigate("/checkout/address");
  };

  return (
    <main className="page-stack">
      <Toast toast={toast} onDismiss={dismiss} />

      <section className="section-panel">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-danger-100">
            <XCircle size={40} className="text-danger-600" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-2xl text-ink-900">Payment failed</h2>
          <p className="mt-1 text-sm text-ink-500">
            Don&rsquo;t worry — you have not been charged for this order.
          </p>

          {failureReason ? (
            <div
              role="alert"
              className="mt-5 w-full rounded-xl border border-danger-100 bg-danger-100/30 px-4 py-3 text-sm text-danger-600"
            >
              {failureReason}
            </div>
          ) : null}

          {pendingOrder ? (
            <div className="mt-5 w-full rounded-2xl border border-ink-100 bg-white p-5 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Order</p>
                  <p className="font-display text-lg text-ink-900">{pendingOrder.orderId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Amount due</p>
                  <p className="font-display text-lg text-ink-900">
                    {currencyFormatter.format(pendingOrder.price || 0)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-500">
                Your items are still reserved. Retry the payment to complete this order, or return to checkout to
                start over (this releases the reservation).
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            {canRetry ? (
              <Button onClick={handleRetry} loading={isRetrying}>
                <RefreshCcw size={16} aria-hidden="true" /> Retry Payment
              </Button>
            ) : null}
            <Button variant="secondary" onClick={handleReturnToCheckout} loading={isCancelling}>
              Return to Checkout
            </Button>
            <Button as={Link} to="/cart" variant="ghost">
              Back to Cart
            </Button>
          </div>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Payment issue${pendingOrder ? ` for order ${pendingOrder.orderId}` : ""}`}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600"
          >
            <Mail size={15} aria-hidden="true" /> Contact support
          </a>
        </div>
      </section>
    </main>
  );
}

export default PaymentFailedPage;
