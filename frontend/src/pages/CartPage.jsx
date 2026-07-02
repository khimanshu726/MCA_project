import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AddressManager from "../components/AddressManager";
import CartItemRow from "../components/CartItemRow";
import OrderNotesCard from "../components/OrderNotesCard";
import OrderSummary from "../components/OrderSummary";
import PaymentSelector from "../components/PaymentSelector";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";
import { createOrder, createRazorpayOrder, verifyRazorpayPayment } from "../lib/api";
import { validateCheckoutFile } from "../utils/orderValidation";

const orderCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatMoney = (value) => orderCurrency.format(value || 0);

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

function CartPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart, removeFromCart, updateQuantity } = useCart();
  const { isAuthenticated, user, token } = useUserAuth();

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [addressState, setAddressState] = useState({
    selectedAddress: null,
    effectiveAddress: null,
    selectedAddressErrors: {},
    hasErrors: false,
    openForm: () => undefined,
  });
  const [customInstructions, setCustomInstructions] = useState("");
  const [designFile, setDesignFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [toast, setToast] = useState(null);

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems],
  );
  const shipping = cartItems.length > 0 ? 120 : 0;
  const total = subtotal + shipping;

  const canPlaceOrder = useMemo(() => {
    if (isPlacingOrder) return false;
    if (!addressState.effectiveAddress) return false;
    if (cartItems.length === 0) return false;
    if (addressState.hasErrors) return false;
    return true;
  }, [addressState.effectiveAddress, addressState.hasErrors, cartItems.length, isPlacingOrder]);

  const placeOrderDisabledReason = useMemo(() => {
    if (isPlacingOrder) return "Processing your order...";
    if (cartItems.length === 0) return "Add at least one product to continue.";
    if (!addressState.effectiveAddress) return "Add delivery details to continue.";
    const firstError = Object.values(addressState.selectedAddressErrors).find((value) => value);
    return firstError || "";
  }, [
    addressState.effectiveAddress,
    addressState.selectedAddressErrors,
    cartItems.length,
    isPlacingOrder,
  ]);

  const pushToast = useCallback((nextToast) => {
    setToast(nextToast);
    window.clearTimeout(pushToast._timer);
    pushToast._timer = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const handleAddressChange = useCallback((next) => {
    setAddressState(next);
  }, []);

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    const nextError = validateCheckoutFile(nextFile);
    setDesignFile(nextFile);
    setFileError(nextError);
    setOrderMessage("");
    setOrderReceipt(null);
  };

  const buildOrderFormData = (effectiveAddress) => {
    const formData = new FormData();
    formData.append("customerName", effectiveAddress.fullName);
    formData.append("phone", effectiveAddress.phoneNumber);
    formData.append("email", effectiveAddress.email);
    formData.append("streetAddress", effectiveAddress.address);
    formData.append("landmark", effectiveAddress.landmark || "");
    formData.append("city", effectiveAddress.city);
    formData.append("state", effectiveAddress.state);
    formData.append("pincode", effectiveAddress.postalCode);
    formData.append("paymentMethod", paymentMethod);
    formData.append("shippingCharge", String(shipping));
    formData.append("customInstructions", customInstructions);
    formData.append(
      "lineItems",
      JSON.stringify(
        cartItems.map((item) => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          customizationText: item.customizationText || "",
        })),
      ),
    );

    if (designFile) formData.append("designFile", designFile);
    return formData;
  };

  const runRazorpayFlow = async (response, effectiveAddress) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setOrderMessage("Failed to load payment gateway. Please try again.");
      setIsPlacingOrder(false);
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: response.razorpay?.amount ?? Math.round(total * 100),
      currency: response.razorpay?.currency ?? "INR",
      name: "Elite Empressions",
      description: "Print Shop Order",
      order_id: response.order.razorpayOrderId,
      modal: {
        ondismiss: () => pushToast({ type: "error", message: "Payment cancelled." }),
      },
      handler: async (paymentResponse) => {
        try {
          const verifyData = await verifyRazorpayPayment({
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          });
          setOrderReceipt(verifyData.order);
          setOrderMessage(`Payment successful! Order ${verifyData.order.orderId} is confirmed.`);
          pushToast({ type: "success", message: "Payment successful." });
          clearCart();
          navigate("/order-success", { replace: true, state: { order: verifyData.order } });
        } catch (err) {
          setOrderMessage(err.message || "Server error during payment verification.");
          pushToast({ type: "error", message: err.message || "Payment verification failed." });
        }
      },
      prefill: {
        name: effectiveAddress.fullName,
        email: effectiveAddress.email,
        contact: effectiveAddress.phoneNumber,
      },
      theme: { color: "#3b82f6" },
    };

    const razorpayInstance = new window.Razorpay(options);
    razorpayInstance.on("payment.failed", () => {
      setOrderMessage("Payment failed. Please try again.");
      pushToast({ type: "error", message: "Payment failed." });
    });

    razorpayInstance.open();
    setIsPlacingOrder(false);
    setCustomInstructions("");
    setDesignFile(null);
    setFileError("");
  };

  const handlePlaceOrder = async () => {
    const effectiveAddress = addressState.effectiveAddress;

    if (!effectiveAddress) {
      setOrderMessage("Select or add a delivery address before placing the order.");
      addressState.openForm();
      return;
    }

    if (cartItems.length === 0) {
      setOrderMessage("Add at least one product before placing an order.");
      return;
    }

    if (addressState.hasErrors) {
      setOrderMessage("Please correct the selected delivery address before placing the order.");
      pushToast({ type: "error", message: "Delivery details are incomplete." });
      return;
    }

    const nextFileError = validateCheckoutFile(designFile);
    if (nextFileError) {
      setFileError(nextFileError);
      setOrderMessage("Please correct the design file before placing the order.");
      return;
    }

    setIsPlacingOrder(true);
    setOrderMessage("");
    setOrderReceipt(null);

    try {
      const formData = buildOrderFormData(effectiveAddress);
      const orderToken = isAuthenticated && token ? token : null;

      const response =
        paymentMethod === "cod"
          ? await createOrder(formData, orderToken)
          : await createRazorpayOrder(formData, orderToken);

      if (response.order.paymentMethod !== "cod" && response.order.razorpayOrderId) {
        await runRazorpayFlow(response, effectiveAddress);
        return;
      }

      setOrderReceipt(response.order);
      setOrderMessage(`Order ${response.order.orderId} was placed successfully.`);
      pushToast({ type: "success", message: "Order placed successfully." });
      setCustomInstructions("");
      setDesignFile(null);
      setFileError("");
      clearCart();
      navigate("/order-success", { replace: true, state: { order: response.order } });
    } catch (submitError) {
      const errorMessage =
        submitError.payload?.message || submitError.message || "Unable to place the order.";
      setOrderMessage(errorMessage);
      pushToast({ type: "error", message: errorMessage });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <main className="page-stack">
      {toast ? (
        <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Cart + Checkout</p>
          <h2>Place print orders with delivery, payment, and production files in one flow.</h2>
          <p className="section-copy">
            Customers can review products, attach design files, and send complete order details
            directly to the admin dashboard.
          </p>
        </div>

        <div className="cart-layout">
          <div className="cart-column">
            {cartItems.length > 0 ? (
              cartItems.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onQuantityChange={updateQuantity}
                  onRemove={removeFromCart}
                  priceLabel={formatMoney(item.price * item.quantity)}
                />
              ))
            ) : (
              <div className="summary-card">
                <p className="eyebrow">Cart empty</p>
                <p className="section-copy">
                  Your cart has no products right now. Browse the catalog to add items.
                </p>
                <div className="action-row">
                  <Link className="primary-button" to="/products">Browse Products</Link>
                </div>
              </div>
            )}

            <OrderNotesCard
              customInstructions={customInstructions}
              onInstructionsChange={setCustomInstructions}
              designFile={designFile}
              fileError={fileError}
              onFileChange={handleFileChange}
            />
          </div>

          <aside className="checkout-column">
            <AddressManager
              user={user}
              isAuthenticated={isAuthenticated}
              onAddressChange={handleAddressChange}
              onOrderMessage={setOrderMessage}
            />

            <PaymentSelector paymentMethod={paymentMethod} onChange={setPaymentMethod} />

            <OrderSummary
              selectedAddress={addressState.selectedAddress}
              subtotal={subtotal}
              shipping={shipping}
              total={total}
              formatMoney={formatMoney}
              orderMessage={orderMessage}
              orderReceipt={orderReceipt}
              canPlaceOrder={canPlaceOrder}
              placeOrderDisabledReason={placeOrderDisabledReason}
              isPlacingOrder={isPlacingOrder}
              onPlaceOrder={handlePlaceOrder}
            />
          </aside>
        </div>
      </section>
    </main>
  );
}

export default CartPage;
