import { verifyRazorpayPayment } from "../lib/api";
import { loadRazorpayScript } from "./checkout";

export const RAZORPAY_THEME_COLOR = "#b8461d";

/**
 * Opens Razorpay Checkout for an already-created PaymentPending order and
 * runs server-side signature verification when the gateway reports success.
 * Shared by CheckoutReviewPage (first attempt) and PaymentFailedPage
 * (retries against the same Razorpay order).
 *
 * Callback contract:
 *  - onVerified(order)         — the backend verified the signature; `order`
 *                                is the confirmed (Placed/Paid) order.
 *  - onTerminalFailure(reason) — this attempt is over: the script failed to
 *                                load, server-side verification rejected the
 *                                payment, or the customer closed the modal.
 *
 * A gateway-level `payment.failed` alone is deliberately NOT terminal:
 * Razorpay's own modal stays open and offers an in-modal retry. We only
 * treat it as the failure reason if the customer then dismisses the modal.
 */
export async function openRazorpayCheckout({ orderResponse, prefill, onVerified, onTerminalFailure }) {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    onTerminalFailure("We couldn't load the payment gateway. Check your connection and try again.");
    return;
  }

  const { order, razorpay } = orderResponse;
  let lastGatewayFailure = null;
  let verificationStarted = false;

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: razorpay?.amount ?? Math.round((order.price || 0) * 100),
    currency: razorpay?.currency ?? "INR",
    name: "Elite Empressions",
    description: "Print Shop Order",
    order_id: order.razorpayOrderId,
    modal: {
      ondismiss: () => {
        // Success also dismisses the modal, just before/while the handler
        // runs — only report a terminal failure for a genuine walk-away.
        if (verificationStarted) return;
        onTerminalFailure(lastGatewayFailure || "Payment was cancelled before completion.");
      },
    },
    handler: async (paymentResponse) => {
      verificationStarted = true;
      try {
        const verifyData = await verifyRazorpayPayment({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
        });
        onVerified(verifyData.order);
      } catch (error) {
        onTerminalFailure(error.payload?.message || error.message || "Server error during payment verification.");
      }
    },
    prefill,
    theme: { color: RAZORPAY_THEME_COLOR },
  };

  const razorpayInstance = new window.Razorpay(options);
  razorpayInstance.on("payment.failed", (event) => {
    lastGatewayFailure = event?.error?.description || "Your payment could not be completed.";
  });

  razorpayInstance.open();
}
