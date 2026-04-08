import crypto from "node:crypto";

export const allowedPaymentMethods = ["cod", "upi", "card"];
export const allowedOrderStatuses = ["New", "Processing", "Completed", "Cancelled"];
export const allowedPaymentStatuses = ["Pending", "Paid"];
export const allowedNotificationStatuses = ["Unread", "Seen"];

export const parseLineItems = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const normalizeLineItems = (lineItems) =>
  lineItems
    .filter((item) => item && typeof item.name === "string")
    .map((item) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);

      return {
        productId: item.productId || item.id || crypto.randomUUID(),
        name: item.name.trim(),
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        customizationText: typeof item.customizationText === "string" ? item.customizationText.trim() : "",
      };
    });

export const validateOrderPayload = ({
  customerName,
  phone,
  email,
  streetAddress,
  city,
  state,
  pincode,
  lineItems,
  paymentMethod,
}) => {
  const errors = {};

  if (!customerName?.trim()) {
    errors.customerName = "Customer name is required.";
  }

  if (!/^\d{10}$/.test(phone || "")) {
    errors.phone = "Phone number must be exactly 10 digits.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
    errors.email = "A valid email address is required.";
  }

  if (!streetAddress?.trim()) {
    errors.streetAddress = "Street address is required.";
  }

  if (!city?.trim()) {
    errors.city = "City is required.";
  }

  if (!state?.trim()) {
    errors.state = "State is required.";
  }

  if (!/^\d{6}$/.test(pincode || "")) {
    errors.pincode = "Pincode must be exactly 6 digits.";
  }

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    errors.lineItems = "Add at least one product before placing the order.";
  }

  if (!allowedPaymentMethods.includes(paymentMethod)) {
    errors.paymentMethod = "Select a valid payment method.";
  }

  return errors;
};

export const hasErrors = (errors) => Object.values(errors).some(Boolean);

export const createOrderId = () => {
  const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `EE-${dateSegment}-${suffix}`;
};

export const createUploadedFileUrl = (req, file) => {
  if (!file) {
    return "";
  }

  return `${req.protocol}://${req.get("host")}/uploads/orders/${file.filename}`;
};
