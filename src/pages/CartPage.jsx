import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AddressManager from "../components/AddressManager";
import CartItemRow from "../components/CartItemRow";
import OrderNotesCard from "../components/OrderNotesCard";
import OrderSummary from "../components/OrderSummary";
import PaymentSelector from "../components/PaymentSelector";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../hooks/useToast";
import { createOrder, createRazorpayOrder, verifyRazorpayPayment } from "../lib/api";
import { buildOrderFormData, loadRazorpayScript } from "../utils/checkout";
import { validateCheckoutFile } from "../utils/orderValidation";

const orderCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatMoney = (value) => orderCurrency.format(value || 0);

const RAZORPAY_THEME_COLOR = "#3b82f6";
const SHIPPING_FEE = 120;

const emptyAddressState = {
  selectedAddress: null,
  effectiveAddress: null,
  selectedAddressErrors: {},
  hasErrors: false,
  openForm: () => undefined,
};

const resolvePlaceOrderReason = ({
  isPlacingOrder,
  cartItems,
  effectiveAddress,
  selectedAddressErrors,
}) => {
  if (isPlacingOrder) return "Processing your order...";
  if (cartItems.length === 0) return "Add at least one product to continue.";
  if (!effectiveAddress) return "Add delivery details to continue.";
  const firstError = Object.values(selectedAddressErrors).find((value) => value);
  return firstError || "";
};

function CartPage() {
  const navigate = useNavigate();
  const { cartItems, clearCart, removeFromCart, updateQuantity } = useCart();
  const { isAuthenticated, user, token } = useUserAuth();
  const { toast, pushToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [addressState, setAddressState] = useState(emptyAddressState);
  const [customInstructions, setCustomInstructions] = useState("");
  const [designFile, setDesignFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems],
  );
  const shipping = cartItems.length > 0 ? SHIPPING_FEE : 0;
  const total = subtotal + shipping;

  const canPlaceOrder =
    !isPlacingOrder &&
    Boolean(addressState.effectiveAddress) &&
    cartItems.length > 0 &&
    !addressState.hasErrors;

  const placeOrderDisabledReason = useMemo(
    () =>
      resolvePlaceOrderReason({
        isPlacingOrder,
        cartItems,
        effectiveAddress: addressState.effectiveAddress,
        selectedAddressErrors: addressState.selectedAddressErrors,
      }),
    [
      isPlacingOrder,
      cartItems,
      addressState.effectiveAddress,
      addressState.selectedAddressErrors,
    ],
  );

  const handleAddressChange = useCallback((next) => setAddressState(next), []);

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    const nextError = validateCheckoutFile(nextFile);
    setDesignFile(nextFile);
    setFileError(nextError);
    setOrderMessage("");
    setOrderReceipt(null);
  };

  const finalizeCodOrder = (order) => {
    setOrderReceipt(order);
    setOrderMessage(`Order ${order.orderId} was placed successfully.`);
    pushToast({ type: "success", message: "Order placed successfully." });
    setCustomInstructions("");
    setDesignFile(null);
    setFileError("");
    clearCart();
    navigate("/order-success", { replace: true, state: { order } });
  };

  const openRazorpayCheckout = async (response, effectiveAddress) => {
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
          const message = err.message || "Server error during payment verification.";
          setOrderMessage(message);
          pushToast({ type: "error", message });
        }
      },
      prefill: {
        name: effectiveAddress.fullName,
        email: effectiveAddress.email,
        contact: effectiveAddress.phoneNumber,
      },
      theme: { color: RAZORPAY_THEME_COLOR },
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

  const validateBeforePlacingOrder = () => {
    const effectiveAddress = addressState.effectiveAddress;

    if (!effectiveAddress) {
      setOrderMessage("Select or add a delivery address before placing the order.");
      addressState.openForm();
      return null;
    }
    if (cartItems.length === 0) {
      setOrderMessage("Add at least one product before placing an order.");
      return null;
    }
    if (addressState.hasErrors) {
      setOrderMessage("Please correct the selected delivery address before placing the order.");
      pushToast({ type: "error", message: "Delivery details are incomplete." });
      return null;
    }

    const nextFileError = validateCheckoutFile(designFile);
    if (nextFileError) {
      setFileError(nextFileError);
      setOrderMessage("Please correct the design file before placing the order.");
      return null;
    }

    return effectiveAddress;
  };

  const handlePlaceOrder = async () => {
    const effectiveAddress = validateBeforePlacingOrder();
    if (!effectiveAddress) return;

    setIsPlacingOrder(true);
    setOrderMessage("");
    setOrderReceipt(null);

    try {
      const formData = buildOrderFormData({
        effectiveAddress,
        paymentMethod,
        shipping,
        customInstructions,
        cartItems,
        designFile,
      });
      const orderToken = isAuthenticated && token ? token : null;

      const response =
        paymentMethod === "cod"
          ? await createOrder(formData, orderToken)
          : await createRazorpayOrder(formData, orderToken);

      if (response.order.paymentMethod !== "cod" && response.order.razorpayOrderId) {
        await openRazorpayCheckout(response, effectiveAddress);
        return;
      }

      finalizeCodOrder(response.order);
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
