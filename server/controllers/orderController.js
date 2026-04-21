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
  const lineItems = normalizeLineItems(rawLineItems);

  const errors = validateOrderPayload({
    customerName: req.body.customerName,
    phone: req.body.phone,
    email: req.body.email,
    streetAddress: req.body.streetAddress,
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode,
    lineItems,
    paymentMethod: req.body.paymentMethod,
  });

  if (hasErrors(errors)) {
    await deleteUploadedFile(req.file?.path);
    return res.status(400).json({ message: "Please correct the order form fields.", errors });
  }

  try {
    const totalQuantity = lineItems.reduce((total, item) => total + item.quantity, 0);
    const lineItemsTotal = lineItems.reduce((total, item) => total + item.totalPrice, 0);
    const shippingCharge = Math.max(0, Number(req.body.shippingCharge) || 0);
    const totalPrice = lineItemsTotal + shippingCharge;
    const paymentMethod = req.body.paymentMethod;
    const paymentStatus = paymentMethod === "cod" ? "Pending" : "Paid";

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
      price: totalPrice,
      shippingCharge,
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

    if (paymentMethod !== "cod" && razorpayInstance) {
      try {
        const razorpayOrder = await razorpayInstance.orders.create({
          amount: Math.round(totalPrice * 100),
          currency: "INR",
          receipt: order.orderId,
        });
        order.razorpayOrderId = razorpayOrder.id;
        order.paymentStatus = "Pending";
      } catch (razorpayError) {
        console.error("Razorpay error:", razorpayError);
        await deleteUploadedFile(req.file?.path);
        return res.status(500).json({ message: "Failed to initialize payment gateway." });
      }
    }

    const savedOrder = await createOrderRecord(order);

    sendOrderNotifications(savedOrder).catch(() => {
      // Local development should not fail when SMTP is not configured.
    });

    return res.status(201).json({
      message: "Order placed successfully.",
      order: savedOrder,
    });
  } catch (error) {
    await deleteUploadedFile(req.file?.path);
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
