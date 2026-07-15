import crypto from "node:crypto";
import cloudinary from "../config/cloudinary.js";
import razorpayInstance from "../config/razorpay.js";
import {
  createOrderRecord,
  deleteOrderRecord,
  getOrderById,
  listOrders,
  updateOrderRecord,
  bulkUpdateOrderRecords,
  bulkDeleteOrderRecords,
} from "../services/orderStore.js";
import { decrementStockAtomic, getProductsByIds, restoreStock } from "../services/productStore.js";
import { computeCartPricing } from "../services/pricingService.js";
import { findCouponByCode, incrementCouponUsage, validateCoupon } from "../services/couponStore.js";
import { sendOrderNotifications } from "../services/notificationService.js";
import {
  allowedNotificationStatuses,
  allowedOrderStatuses,
  allowedPaymentStatuses,
  createOrderId,
  createUploadedFileUrl,
  hasErrors,
  normalizeLineItems,
  parseLineItems,
  unconfirmedOrderStatuses,
  validateOrderPayload,
} from "../utils/orderHelpers.js";
import { recordPaymentCaptured, verifyPaymentSignature } from "../services/paymentService.js";

const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes("/upload/")) return null;
  const parts = url.split("/upload/")[1].split("/");
  const pathWithExtension = parts.slice(1).join("/");
  return pathWithExtension.replace(/\.[^/.]+$/, "");
};

const deleteUploadedFile = async (fileUrl) => {
  if (!fileUrl) {
    return;
  }

  try {
    const publicId = extractPublicIdFromUrl(fileUrl);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
  }
};

export const createOrder = async (req, res, next) => {
  const rawLineItems = parseLineItems(req.body.lineItems);
  const requestedLineItems = normalizeLineItems(rawLineItems);

  const errors = validateOrderPayload({
    customerName: req.body.customerName,
    phone: req.body.phone,
    email: req.body.email,
    streetAddress: req.body.streetAddress,
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode,
    lineItems: requestedLineItems,
    paymentMethod: req.body.paymentMethod,
  });

  if (hasErrors(errors)) {
    await deleteUploadedFile(req.file?.path);
    return res.status(400).json({ message: "Please correct the order form fields.", errors });
  }

  // Resolve every line item against the live Product record — the client's
  // productId/quantity are trusted, nothing price-related is.
  const productIds = [...new Set(requestedLineItems.map((item) => item.productId))];
  const products = await getProductsByIds(productIds);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const missingIds = productIds.filter((id) => !productsById.has(id) || productsById.get(id).status !== "active");

  if (missingIds.length > 0) {
    await deleteUploadedFile(req.file?.path);
    return res.status(400).json({
      code: "PRODUCT_NOT_FOUND",
      message: "Some products in your cart are no longer available.",
      productIds: missingIds,
    });
  }

  // Coupon (if any) is re-validated independently server-side — the
  // discount amount is never trusted from the client, only the code hint.
  // Validated before stock is touched so an invalid coupon fails fast.
  let coupon = null;

  if (req.body.couponCode) {
    const requestedSubtotal = requestedLineItems.reduce(
      (sum, item) => sum + productsById.get(item.productId).price * item.quantity,
      0,
    );
    const candidate = await findCouponByCode(req.body.couponCode);
    const validation = validateCoupon(candidate, requestedSubtotal);

    if (!validation.valid) {
      await deleteUploadedFile(req.file?.path);
      return res.status(409).json({ code: "COUPON_INVALID", message: validation.reason });
    }

    coupon = candidate;
  }

  // Atomic, race-safe stock decrement per item (see productStore.decrementStockAtomic).
  // On any failure, compensate by restoring stock for every item already
  // decremented in this request before responding.
  const decremented = [];
  let stockFailure = null;

  for (const item of requestedLineItems) {
    const updatedProduct = await decrementStockAtomic(item.productId, item.quantity);

    if (!updatedProduct) {
      stockFailure = {
        productId: item.productId,
        requested: item.quantity,
        available: productsById.get(item.productId)?.stock ?? 0,
      };
      break;
    }

    decremented.push(item);
  }

  if (stockFailure) {
    await Promise.all(decremented.map((item) => restoreStock(item.productId, item.quantity)));
    await deleteUploadedFile(req.file?.path);
    return res.status(409).json({
      code: "OUT_OF_STOCK",
      message: "One or more items in your cart are out of stock.",
      items: [stockFailure],
    });
  }

  try {
    const lineItems = requestedLineItems.map((item) => {
      const product = productsById.get(item.productId);
      return {
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: product.price * item.quantity,
        customizationText: item.customizationText,
      };
    });

    const pricing = computeCartPricing(
      requestedLineItems.map((item) => {
        const product = productsById.get(item.productId);
        return { price: product.price, mrp: product.mrp, quantity: item.quantity };
      }),
      coupon,
    );

    const totalQuantity = lineItems.reduce((total, item) => total + item.quantity, 0);
    const paymentMethod = req.body.paymentMethod;
    const isOnlinePayment = paymentMethod !== "cod";
    const paymentStatus = "Pending";

    const order = {
      id: crypto.randomUUID(),
      orderId: createOrderId(),
      customerId: req.customer ? req.customer.id : undefined,
      customerName: req.body.customerName.trim(),
      phone: req.body.phone.trim(),
      email: req.body.email.trim(),
      address: {
        street: req.body.streetAddress.trim(),
        landmark: (req.body.landmark || "").trim(),
        city: req.body.city.trim(),
        state: req.body.state.trim(),
        pincode: req.body.pincode.trim(),
      },
      productName: lineItems.map((item) => item.name).join(", "),
      quantity: totalQuantity,
      price: pricing.total,
      shippingCharge: pricing.shipping,
      subtotal: pricing.subtotal,
      discountTotal: pricing.discount,
      platformFee: pricing.platformFee,
      taxAmount: pricing.tax,
      savings: pricing.savings,
      couponCode: pricing.couponCode,
      couponDiscount: pricing.couponDiscount,
      customizationDetails: (req.body.customInstructions || "").trim(),
      uploadedFileURL: createUploadedFileUrl(req, req.file),
      paymentMethod,
      paymentStatus,
      // Online orders are NOT confirmed at creation: they sit in
      // PaymentPending (stock reserved, excluded from customer history and
      // fulfilment) until signature verification or the payment.captured
      // webhook promotes them to Placed. Only COD confirms immediately.
      orderStatus: isOnlinePayment ? "PaymentPending" : "Placed",
      statusHistory: [
        isOnlinePayment
          ? { status: "PaymentPending", changedAt: new Date().toISOString(), note: "Awaiting payment confirmation." }
          : { status: "Placed", changedAt: new Date().toISOString(), note: "Order placed." },
      ],
      notificationStatus: "Unread",
      archived: false,
      lineItems,
      createdAt: new Date().toISOString(),
    };

    if (isOnlinePayment && !razorpayInstance) {
      await deleteUploadedFile(req.file?.path);
      await Promise.all(decremented.map((item) => restoreStock(item.productId, item.quantity)));
      return res.status(503).json({ message: "Online payments are not configured on this server." });
    }

    if (isOnlinePayment && razorpayInstance) {
      try {
        const razorpayOrder = await razorpayInstance.orders.create({
          amount: Math.round(pricing.total * 100),
          currency: "INR",
          receipt: order.orderId,
        });
        order.razorpayOrderId = razorpayOrder.id;
        order.paymentStatus = "Pending";
      } catch (razorpayError) {
        console.error("Razorpay error:", razorpayError);
        await deleteUploadedFile(req.file?.path);
        await Promise.all(decremented.map((item) => restoreStock(item.productId, item.quantity)));
        return res.status(500).json({ message: "Failed to initialize payment gateway." });
      }
    }

    const savedOrder = await createOrderRecord(order);

    if (coupon) {
      // Awaited (not fire-and-forget) so usage-limit enforcement is
      // consistent for a rapid next order — the order itself is already
      // placed at this point, so a failure here is logged, not fatal.
      await incrementCouponUsage(coupon.code).catch((error) => {
        console.error(`Failed to increment usage for coupon ${coupon.code}:`, error);
      });
    }

    sendOrderNotifications(savedOrder).catch(() => {
      // Local development should not fail when SMTP is not configured.
    });

    const razorpayPayload = savedOrder.razorpayOrderId
      ? {
          order_id: savedOrder.razorpayOrderId,
          amount: Math.round(pricing.total * 100),
          currency: "INR",
        }
      : null;

    return res.status(201).json({
      message: "Order placed successfully.",
      order: savedOrder,
      razorpay: razorpayPayload,
    });
  } catch (error) {
    await deleteUploadedFile(req.file?.path);
    await Promise.all(decremented.map((item) => restoreStock(item.productId, item.quantity)));
    return next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const orders = await listOrders({
      status: req.query.status,
      date: req.query.date,
      query: req.query.query,
      onlyNew: req.query.onlyNew === "true",
      includeArchived: req.query.includeArchived === "true",
    });

    return res.json({ orders });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await listOrders({
      customerId: req.customer.id,
      includeArchived: true, // customers should see all their history
    });

    // PaymentPending/PaymentFailed records are payment reservations, not
    // orders the customer placed — a confirmed order only exists after the
    // gateway signature verified. They never appear in "My Orders".
    const confirmedOrders = orders.filter((order) => !unconfirmedOrderStatuses.includes(order.orderStatus));

    return res.json({ orders: confirmedOrders });
  } catch (error) {
    return next(error);
  }
};

// Ownership-checked single-order lookup for the customer-facing order-success
// / order-detail pages. Guest orders (no customerId) are reachable only by an
// unauthenticated caller — the order id itself is the capability, same as
// most guest-checkout confirmation links; an authenticated caller can only
// see orders tied to their own account.
export const getCustomerOrder = async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const isOwner = req.customer ? order.customerId === req.customer.id : !order.customerId;
    if (!isOwner) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.json({ order });
  } catch (error) {
    return next(error);
  }
};

const CANCELLABLE_STATUSES = ["Placed", "Confirmed"];
const RETURNABLE_STATUSES = ["Delivered"];

const findOwnedOrder = async (req) => {
  const order = await getOrderById(req.params.id);
  if (!order) return null;
  const isOwner = req.customer ? order.customerId === req.customer.id : !order.customerId;
  return isOwner ? order : null;
};

export const cancelCustomerOrder = async (req, res, next) => {
  try {
    const order = await findOwnedOrder(req);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (!CANCELLABLE_STATUSES.includes(order.orderStatus)) {
      return res.status(409).json({ message: `Orders that are ${order.orderStatus} can no longer be cancelled.` });
    }

    await Promise.all((order.lineItems || []).map((item) => restoreStock(item.productId, item.quantity)));

    const updatedOrder = await updateOrderRecord(order.id, (currentOrder) => ({
      ...currentOrder,
      orderStatus: "Cancelled",
      statusHistory: [
        ...(currentOrder.statusHistory || []),
        { status: "Cancelled", changedAt: new Date().toISOString(), note: "Cancelled by customer." },
      ],
      updatedAt: new Date().toISOString(),
    }));

    return res.json({ message: "Order cancelled.", order: updatedOrder });
  } catch (error) {
    return next(error);
  }
};

export const returnCustomerOrder = async (req, res, next) => {
  try {
    const order = await findOwnedOrder(req);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (!RETURNABLE_STATUSES.includes(order.orderStatus)) {
      return res.status(409).json({ message: "Only delivered orders can be returned." });
    }

    const updatedOrder = await updateOrderRecord(order.id, (currentOrder) => ({
      ...currentOrder,
      orderStatus: "Returned",
      statusHistory: [
        ...(currentOrder.statusHistory || []),
        { status: "Returned", changedAt: new Date().toISOString(), note: "Return requested by customer." },
      ],
      updatedAt: new Date().toISOString(),
    }));

    return res.json({ message: "Return requested.", order: updatedOrder });
  } catch (error) {
    return next(error);
  }
};

export const getOrder = async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.json({ order });
  } catch (error) {
    return next(error);
  }
};

export const updateOrder = async (req, res, next) => {
  const { orderStatus, paymentStatus, archived, notificationStatus, trackingId } = req.body;

  if (orderStatus && !allowedOrderStatuses.includes(orderStatus)) {
    return res.status(400).json({ message: "Invalid order status." });
  }

  if (paymentStatus && !allowedPaymentStatuses.includes(paymentStatus)) {
    return res.status(400).json({ message: "Invalid payment status." });
  }

  if (notificationStatus && !allowedNotificationStatuses.includes(notificationStatus)) {
    return res.status(400).json({ message: "Invalid notification status." });
  }

  try {
    const updatedOrder = await updateOrderRecord(req.params.id, (currentOrder) => {
      const isStatusChange = orderStatus && orderStatus !== currentOrder.orderStatus;

      return {
        ...currentOrder,
        orderStatus: orderStatus || currentOrder.orderStatus,
        paymentStatus: paymentStatus || currentOrder.paymentStatus,
        archived: typeof archived === "boolean" ? archived : currentOrder.archived,
        notificationStatus: notificationStatus || currentOrder.notificationStatus,
        trackingId: typeof trackingId === "string" ? trackingId.trim() : currentOrder.trackingId,
        statusHistory: isStatusChange
          ? [...(currentOrder.statusHistory || []), { status: orderStatus, changedAt: new Date().toISOString() }]
          : currentOrder.statusHistory,
        updatedAt: new Date().toISOString(),
      };
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.json({
      message: "Order updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    const existingOrder = await getOrderById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    const wasDeleted = await deleteOrderRecord(req.params.id);

    if (existingOrder.uploadedFileURL) {
      await deleteUploadedFile(existingOrder.uploadedFileURL);
    }

    return res.json({
      message: wasDeleted ? "Order deleted successfully." : "Order was not deleted.",
    });
  } catch (error) {
    return next(error);
  }
};

export const bulkOrderAction = async (req, res, next) => {
  const { orderIds, action, status } = req.body;

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ message: "No orders selected for bulk action." });
  }

  try {
    if (action === "delete") {
      await bulkDeleteOrderRecords(orderIds);
      return res.json({ message: `${orderIds.length} orders deleted successfully.` });
    } else if (action === "updateStatus") {
      if (!allowedOrderStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid order status provided for bulk update." });
      }
      await bulkUpdateOrderRecords(orderIds, { orderStatus: status, notificationStatus: "Seen", updatedAt: new Date().toISOString() });
      return res.json({ message: `${orderIds.length} orders marked as ${status}.` });
    } else {
      return res.status(400).json({ message: "Unknown bulk action." });
    }
  } catch (error) {
    return next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: "Payment verification is not configured on this server." });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification parameters." });
    }

    if (
      !verifyPaymentSignature({
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        signature: razorpay_signature,
      })
    ) {
      return res.status(400).json({ message: "Payment verification failed: Invalid signature." });
    }

    // Enrich the payment record with gateway detail (method, card network,
    // full entity) when reachable — verification itself never depends on
    // this round-trip, only on the signature above.
    let gatewayResponse = null;
    let method = "";
    if (razorpayInstance) {
      try {
        gatewayResponse = await razorpayInstance.payments.fetch(razorpay_payment_id);
        method = gatewayResponse?.method || "";
      } catch {
        // Offline/test environments: record the capture without gateway detail.
      }
    }

    const { order, payment } = await recordPaymentCaptured({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      method,
      gatewayResponse,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.json({
      message: "Payment verified successfully.",
      order,
      payment: payment ? { id: payment.id, status: payment.status, method: payment.method } : null,
    });
  } catch (error) {
    return next(error);
  }
};

// Explicit customer bail-out from an online payment: releases the stock the
// PaymentPending order was reserving and marks it PaymentFailed so it never
// surfaces as a real order. This is the ONLY path that releases a payment
// reservation — a declined attempt keeps the reservation so the customer
// can retry against the same Razorpay order.
export const cancelPendingPayment = async (req, res, next) => {
  try {
    const order = await findOwnedOrder(req);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.orderStatus !== "PaymentPending") {
      return res.status(409).json({ message: "Only orders awaiting payment can be cancelled this way." });
    }

    await Promise.all((order.lineItems || []).map((item) => restoreStock(item.productId, item.quantity)));

    const updatedOrder = await updateOrderRecord(order.id, (currentOrder) => ({
      ...currentOrder,
      orderStatus: "PaymentFailed",
      statusHistory: [
        ...(currentOrder.statusHistory || []),
        {
          status: "PaymentFailed",
          changedAt: new Date().toISOString(),
          note: "Payment cancelled by customer; reserved stock released.",
        },
      ],
      updatedAt: new Date().toISOString(),
    }));

    return res.json({ message: "Payment cancelled.", order: updatedOrder });
  } catch (error) {
    return next(error);
  }
};
