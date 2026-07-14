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
  validateOrderPayload,
} from "../utils/orderHelpers.js";

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
      customizationDetails: (req.body.customInstructions || "").trim(),
      uploadedFileURL: createUploadedFileUrl(req, req.file),
      paymentMethod,
      paymentStatus,
      orderStatus: "New",
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

    return res.json({ orders });
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
  const { orderStatus, paymentStatus, archived, notificationStatus } = req.body;

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
    const updatedOrder = await updateOrderRecord(req.params.id, (currentOrder) => ({
      ...currentOrder,
      orderStatus: orderStatus || currentOrder.orderStatus,
      paymentStatus: paymentStatus || currentOrder.paymentStatus,
      archived: typeof archived === "boolean" ? archived : currentOrder.archived,
      notificationStatus: notificationStatus || currentOrder.notificationStatus,
      updatedAt: new Date().toISOString(),
    }));

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

    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest("hex");

    if (digest !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed: Invalid signature." });
    }

    const updatedOrder = await updateOrderRecord(razorpay_order_id, {
      paymentStatus: "Paid",
      razorpayPaymentId: razorpay_payment_id,
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.json({ message: "Payment verified successfully.", order: updatedOrder });
  } catch (error) {
    return next(error);
  }
};
