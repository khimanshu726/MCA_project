import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import OrderNotesCard from "../components/OrderNotesCard";
import PaymentSelector from "../components/PaymentSelector";
import OrderSummaryCard from "../components/cart/OrderSummaryCard";
import CheckoutProgress from "../components/checkout/CheckoutProgress";
import ResponsiveImage from "../components/ResponsiveImage";
import Toast from "../components/ui/Toast";
import { currencyFormatter } from "../components/ui/PriceDisplay";
import { useCheckout } from "../context/CheckoutContext";
import { useCart } from "../hooks/useCart";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../hooks/useToast";
import { createOrder, createRazorpayOrder } from "../lib/api";
import { buildOrderFormData } from "../utils/checkout";
import { openRazorpayCheckout } from "../utils/razorpayCheckout";
import { validateCheckoutFile } from "../utils/orderValidation";

function ReviewLineItem({ item }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-50">
        <ResponsiveImage src={item.images?.[0]} alt={item.name} aspectClassName="ratio-square" width={56} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-900">{item.name}</p>
        <p className="text-xs text-ink-500">Qty {item.quantity}</p>
      </div>
      <p className="text-sm font-semibold text-ink-900">{currencyFormatter.format(item.price * item.quantity)}</p>
    </div>
  );
}

function CheckoutReviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    items,
    cartItems,
    pricing,
    isAuthenticated,
    isLoading,
    clearCart,
    applyCoupon,
    removeCoupon,
    isApplyingCoupon,
  } = useCart();
  const { user, token } = useUserAuth();
  const { toast, pushToast, dismiss } = useToast();
  const {
    addressState,
    paymentMethod,
    setPaymentMethod,
    customInstructions,
    setCustomInstructions,
    designFile,
    setDesignFile,
    fileError,
    setFileError,
  } = useCheckout();

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  // Once an order is placed, clearCart() empties the cart and re-renders
  // this page a beat before the navigate("/order-success") below actually
  // takes effect — without this flag, the empty-cart guard fires first and
  // redirects to /cart, clobbering the intended navigation.
  const [hasCompletedOrder, setHasCompletedOrder] = useState(false);

  const activeItems = useMemo(() => items.filter((item) => !item.savedForLater), [items]);
  const purchasableCartItems = useMemo(
    () =>
      cartItems.filter((item) =>
        activeItems.some((entry) => entry.productId === item.id && !entry.isOutOfStock && !entry.isMissing),
      ),
    [cartItems, activeItems],
  );

  const shipping = pricing.shipping;
  const effectiveAddress = addressState.effectiveAddress;

  // Same race as CheckoutAddressPage: check the raw (synchronous) item
  // count for the guard, not purchasableCartItems, which depends on live
  // product data that hasn't loaded yet on a hard refresh/direct nav.
  if (!hasCompletedOrder && !isLoading && activeItems.length === 0) {
    return <Navigate to="/cart" replace />;
  }
  if (!effectiveAddress || addressState.hasErrors) {
    return <Navigate to="/checkout/address" replace />;
  }

  const canPlaceOrder = !isPlacingOrder && purchasableCartItems.length > 0;

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    const nextError = validateCheckoutFile(nextFile);
    setDesignFile(nextFile);
    setFileError(nextError);
    setOrderMessage("");
  };

  const finalizeCodOrder = (order) => {
    setHasCompletedOrder(true);
    pushToast({ type: "success", message: "Order placed successfully." });
    setCustomInstructions("");
    setDesignFile(null);
    setFileError("");
    clearCart();
    navigate(`/order-success/${order.orderId}`, { replace: true, state: { order } });
  };

  const startOnlinePayment = async (response) => {
    const prefill = {
      name: effectiveAddress.fullName,
      email: effectiveAddress.email || user?.email || "",
      contact: effectiveAddress.phoneNumber,
    };
    // Everything the failed-payment page needs to retry against the SAME
    // Razorpay order (or cancel it and release the stock reservation).
    const failureState = (reason) => ({
      reason,
      orderResponse: { order: response.order, razorpay: response.razorpay },
      prefill,
    });

    setIsPlacingOrder(false);

    await openRazorpayCheckout({
      orderResponse: response,
      prefill,
      onVerified: (order) => {
        setHasCompletedOrder(true);
        pushToast({ type: "success", message: "Payment successful." });
        setCustomInstructions("");
        setDesignFile(null);
        setFileError("");
        clearCart();
        navigate(`/order-success/${order.orderId}`, { replace: true, state: { order } });
      },
      onTerminalFailure: (reason) => {
        navigate("/payment-failed", { state: failureState(reason) });
      },
    });
  };

  const handlePlaceOrder = async () => {
    const nextFileError = validateCheckoutFile(designFile);
    if (nextFileError) {
      setFileError(nextFileError);
      setOrderMessage("Please correct the design file before placing the order.");
      return;
    }

    setIsPlacingOrder(true);
    setOrderMessage("");

    try {
      const formData = buildOrderFormData({
        effectiveAddress,
        email: effectiveAddress.email || user?.email || "",
        paymentMethod,
        shipping,
        customInstructions,
        cartItems: purchasableCartItems,
        designFile,
        couponCode: pricing.couponCode,
      });
      const orderToken = isAuthenticated && token ? token : null;

      const response =
        paymentMethod === "cod"
          ? await createOrder(formData, orderToken)
          : await createRazorpayOrder(formData, orderToken);

      if (response.order.paymentMethod !== "cod" && response.order.razorpayOrderId) {
        await startOnlinePayment(response);
        return;
      }

      finalizeCodOrder(response.order);
    } catch (submitError) {
      const errorMessage = submitError.payload?.message || submitError.message || "Unable to place the order.";
      setOrderMessage(errorMessage);
      pushToast({ type: "error", message: errorMessage });

      const errorCode = submitError.payload?.code;
      if (errorCode === "OUT_OF_STOCK" || errorCode === "PRODUCT_NOT_FOUND" || errorCode === "COUPON_INVALID") {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <main className="page-stack">
      <Toast toast={toast} onDismiss={dismiss} />

      <section className="section-panel">
        <div className="mb-6">
          <CheckoutProgress currentStep={3} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Step 3 of 4</p>
              <h2 className="mt-1 font-display text-2xl text-ink-900">Review your order</h2>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg text-ink-900">Delivery address</h3>
                <button
                  type="button"
                  className="text-sm font-semibold text-brand-600 hover:underline"
                  onClick={() => navigate("/checkout/address")}
                >
                  Change
                </button>
              </div>
              <div className="text-sm text-ink-700">
                <p className="font-medium text-ink-900">{effectiveAddress.fullName}</p>
                <p>{effectiveAddress.phoneNumber}</p>
                <p>
                  {effectiveAddress.addressLine1}
                  {effectiveAddress.addressLine2 ? `, ${effectiveAddress.addressLine2}` : ""}
                </p>
                {effectiveAddress.landmark ? <p>Landmark: {effectiveAddress.landmark}</p> : null}
                <p>
                  {effectiveAddress.city}, {effectiveAddress.state} - {effectiveAddress.pincode}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
              <h3 className="mb-3 font-display text-lg text-ink-900">Items ({purchasableCartItems.length})</h3>
              <div className="flex flex-col gap-2">
                {purchasableCartItems.map((item) => (
                  <ReviewLineItem key={item.id} item={item} />
                ))}
              </div>
            </div>

            <PaymentSelector paymentMethod={paymentMethod} onChange={setPaymentMethod} />
            <OrderNotesCard
              customInstructions={customInstructions}
              onInstructionsChange={setCustomInstructions}
              designFile={designFile}
              fileError={fileError}
              onFileChange={handleFileChange}
            />

            {orderMessage ? (
              <div className="rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-700">
                {orderMessage}
              </div>
            ) : null}
          </div>

          <aside className="flex flex-col gap-4">
            <OrderSummaryCard
              pricing={pricing}
              itemCount={purchasableCartItems.length}
              onCheckout={handlePlaceOrder}
              canCheckout={canPlaceOrder}
              checkoutDisabledReason={isPlacingOrder ? "Processing your order..." : ""}
              isPlacingOrder={isPlacingOrder}
              isAuthenticated={isAuthenticated}
              isApplyingCoupon={isApplyingCoupon}
              onApplyCoupon={applyCoupon}
              onRemoveCoupon={removeCoupon}
              ctaLabel="Place Order"
            />
          </aside>
        </div>
      </section>
    </main>
  );
}

export default CheckoutReviewPage;
