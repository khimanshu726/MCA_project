/**
 * Builds a FormData payload for the order-create endpoints from the current
 * checkout state. Pulled out of CartPage to shrink its complexity budget.
 */
export function buildOrderFormData({
  effectiveAddress,
  email,
  paymentMethod,
  shipping,
  customInstructions,
  cartItems,
  designFile,
  couponCode,
}) {
  const streetAddress = [effectiveAddress.addressLine1, effectiveAddress.addressLine2]
    .filter(Boolean)
    .join(", ");

  const formData = new FormData();
  formData.append("customerName", effectiveAddress.fullName);
  formData.append("phone", effectiveAddress.phoneNumber);
  formData.append("email", email || effectiveAddress.email || "");
  formData.append("streetAddress", streetAddress);
  formData.append("landmark", effectiveAddress.landmark || "");
  formData.append("city", effectiveAddress.city);
  formData.append("state", effectiveAddress.state);
  formData.append("pincode", effectiveAddress.pincode);
  formData.append("paymentMethod", paymentMethod);
  formData.append("shippingCharge", String(shipping));
  formData.append("customInstructions", customInstructions);
  // name/unitPrice are sent only as an optional display hint — the server
  // (server/controllers/orderController.js#createOrder) resolves the real
  // price and stock from the live Product record and ignores both fields.
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

  if (designFile) {
    formData.append("designFile", designFile);
  }

  // A hint only — the server independently re-validates this code against
  // the resolved subtotal (server/controllers/orderController.js#createOrder)
  // and rejects if it's no longer valid.
  if (couponCode) {
    formData.append("couponCode", couponCode);
  }

  return formData;
}

/**
 * Loads the Razorpay JS SDK on-demand.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

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
}
