import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AddressManager from "../components/AddressManager";
import OrderNotesCard from "../components/OrderNotesCard";
import PaymentSelector from "../components/PaymentSelector";
import CartItemCard from "../components/cart/CartItemCard";
import CartSkeleton from "../components/cart/CartSkeleton";
import EmptyCartState from "../components/cart/EmptyCartState";
import FrequentlyBoughtTogether from "../components/cart/FrequentlyBoughtTogether";
import OrderSummaryCard from "../components/cart/OrderSummaryCard";
import RecentlyViewed from "../components/cart/RecentlyViewed";
import SelectAllBar from "../components/cart/SelectAllBar";
import YouMayAlsoLike from "../components/cart/YouMayAlsoLike";
import Dialog from "../components/ui/Dialog";
import Toast from "../components/ui/Toast";
import Button from "../components/ui/Button";
import { currencyFormatter } from "../components/ui/PriceDisplay";
import { useCart } from "../hooks/useCart";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../hooks/useToast";
import { createOrder, createRazorpayOrder, verifyRazorpayPayment } from "../lib/api";
import { buildOrderFormData, loadRazorpayScript } from "../utils/checkout";
import { validateCheckoutFile } from "../utils/orderValidation";

const RAZORPAY_THEME_COLOR = "#b8461d";

const emptyAddressState = {
  selectedAddress: null,
  effectiveAddress: null,
  selectedAddressErrors: {},
  hasErrors: false,
  openForm: () => undefined,
};

function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    items,
    cartItems,
    pricing,
    couponError,
    isLoading,
    isApplyingCoupon,
    isAuthenticated,
    addToCart,
    removeFromCart,
    updateQuantity,
    toggleSaveForLater,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { user, token } = useUserAuth();
  const { toast, pushToast, dismiss } = useToast();

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [addressState, setAddressState] = useState(emptyAddressState);
  const [customInstructions, setCustomInstructions] = useState("");
  const [designFile, setDesignFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => items.some((item) => item.productId === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  useEffect(() => {
    if (couponError) {
      pushToast({ type: "error", message: couponError });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponError]);

  const activeItems = useMemo(() => items.filter((item) => !item.savedForLater), [items]);
  const savedItems = useMemo(() => items.filter((item) => item.savedForLater), [items]);
  const selectableItems = useMemo(() => activeItems.filter((item) => !item.isOutOfStock), [activeItems]);
  const allSelected = selectableItems.length > 0 && selectableItems.every((item) => selectedIds.has(item.productId));

  // Checkout only ever includes purchasable items — active, in-stock, not
  // saved for later. Selection drives bulk delete, not partial checkout.
  const purchasableCartItems = useMemo(
    () =>
      cartItems.filter((item) =>
        activeItems.some((entry) => entry.productId === item.id && !entry.isOutOfStock && !entry.isMissing),
      ),
    [cartItems, activeItems],
  );

  const shipping = pricing.shipping;
  const total = pricing.total;

  const canPlaceOrder =
    !isPlacingOrder &&
    Boolean(addressState.effectiveAddress) &&
    purchasableCartItems.length > 0 &&
    !addressState.hasErrors;

  const placeOrderDisabledReason = useMemo(() => {
    if (isPlacingOrder) return "Processing your order...";
    if (purchasableCartItems.length === 0) return "Add at least one available product to continue.";
    if (!addressState.effectiveAddress) return "Add delivery details to continue.";
    const firstError = Object.values(addressState.selectedAddressErrors).find((value) => value);
    return firstError || "";
  }, [isPlacingOrder, purchasableCartItems, addressState.effectiveAddress, addressState.selectedAddressErrors]);

  const handleAddressChange = useCallback((next) => setAddressState(next), []);

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    const nextError = validateCheckoutFile(nextFile);
    setDesignFile(nextFile);
    setFileError(nextError);
    setOrderMessage("");
    setOrderReceipt(null);
  };

  const toggleSelect = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableItems.map((item) => item.productId)));
  };

  const handleRemove = async (productId) => {
    const removedItem = items.find((entry) => entry.productId === productId);
    await removeFromCart(productId);

    if (removedItem && !removedItem.isMissing) {
      pushToast({
        type: "info",
        message: `${removedItem.product.name} removed from cart.`,
        action: {
          label: "Undo",
          onClick: () => addToCart(removedItem.product, removedItem.quantity),
        },
      });
    }
  };

  const handleBulkRemove = async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => removeFromCart(id)));
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    pushToast({ type: "success", message: `${ids.length} item${ids.length === 1 ? "" : "s"} removed.` });
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
    if (purchasableCartItems.length === 0) {
      setOrderMessage("Add at least one available product before placing an order.");
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
        await openRazorpayCheckout(response, effectiveAddress);
        return;
      }

      finalizeCodOrder(response.order);
    } catch (submitError) {
      const errorMessage = submitError.payload?.message || submitError.message || "Unable to place the order.";
      setOrderMessage(errorMessage);
      pushToast({ type: "error", message: errorMessage });

      // Server-validated stock/price rejections mean live product data has
      // moved since it was last fetched — refetch so the offending
      // CartItemCard(s) pick up the current isOutOfStock/isPriceChanged flags.
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
        <div className="section-heading">
          <p className="eyebrow">Cart + Checkout</p>
          <h2>Place print orders with delivery, payment, and production files in one flow.</h2>
          <p className="section-copy">
            Customers can review products, attach design files, and send complete order details directly to the
            admin dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <CartSkeleton />
            ) : items.length === 0 ? (
              <EmptyCartState />
            ) : (
              <>
                <SelectAllBar
                  allSelected={allSelected}
                  someSelected={selectedIds.size > 0}
                  onToggleAll={toggleSelectAll}
                  selectedCount={selectedIds.size}
                  totalCount={selectableItems.length}
                  onBulkRemove={() => setBulkDeleteOpen(true)}
                />

                {activeItems.map((item) => (
                  <CartItemCard
                    key={item.productId}
                    item={item}
                    selected={selectedIds.has(item.productId)}
                    onToggleSelect={toggleSelect}
                    onQuantityChange={updateQuantity}
                    onRemove={handleRemove}
                    onToggleSaveForLater={toggleSaveForLater}
                    isAuthenticated={isAuthenticated}
                  />
                ))}

                {savedItems.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="mb-3 font-display text-lg text-ink-900">Saved for later ({savedItems.length})</h3>
                    <div className="flex flex-col gap-4">
                      {savedItems.map((item) => (
                        <CartItemCard
                          key={item.productId}
                          item={item}
                          selected={false}
                          onToggleSelect={() => undefined}
                          onQuantityChange={updateQuantity}
                          onRemove={handleRemove}
                          onToggleSaveForLater={toggleSaveForLater}
                          isAuthenticated={isAuthenticated}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <OrderNotesCard
              customInstructions={customInstructions}
              onInstructionsChange={setCustomInstructions}
              designFile={designFile}
              fileError={fileError}
              onFileChange={handleFileChange}
            />

            <FrequentlyBoughtTogether
              seedProductId={activeItems[0]?.productId}
              excludeIds={items.map((item) => item.productId)}
            />
            <YouMayAlsoLike items={activeItems} excludeIds={items.map((item) => item.productId)} />
            <RecentlyViewed excludeIds={items.map((item) => item.productId)} />
          </div>

          <aside className="flex flex-col gap-4">
            <AddressManager
              user={user}
              isAuthenticated={isAuthenticated}
              onAddressChange={handleAddressChange}
              onOrderMessage={setOrderMessage}
            />

            <PaymentSelector paymentMethod={paymentMethod} onChange={setPaymentMethod} />

            {orderMessage ? (
              <div className="rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-700">
                {orderMessage}
              </div>
            ) : null}

            {orderReceipt ? (
              <div className="rounded-xl border border-success-100 bg-success-100/40 px-4 py-3 text-sm text-success-600">
                Order {orderReceipt.orderId} total: {currencyFormatter.format(orderReceipt.price)}
              </div>
            ) : null}

            <OrderSummaryCard
              pricing={pricing}
              itemCount={purchasableCartItems.length}
              onCheckout={handlePlaceOrder}
              canCheckout={canPlaceOrder}
              checkoutDisabledReason={placeOrderDisabledReason}
              isPlacingOrder={isPlacingOrder}
              isAuthenticated={isAuthenticated}
              isApplyingCoupon={isApplyingCoupon}
              onApplyCoupon={applyCoupon}
              onRemoveCoupon={removeCoupon}
            />
          </aside>
        </div>
      </section>

      <Dialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title="Remove selected items?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkRemove}>
              Remove {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        This will remove {selectedIds.size} selected item{selectedIds.size === 1 ? "" : "s"} from your cart. You can
        undo individual removals from the toast that appears after.
      </Dialog>
    </main>
  );
}

export default CartPage;
