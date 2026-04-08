import { unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  createOrderRecord,
  deleteOrderRecord,
  getOrderById,
  listOrders,
  updateOrderRecord,
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

const deleteUploadedFile = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch {
    // Ignore upload cleanup issues in local development.
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
      const fileName = existingOrder.uploadedFileURL.split("/").pop();
      await deleteUploadedFile(path.resolve(process.cwd(), "uploads", "orders", fileName));
    }

    return res.json({
      message: wasDeleted ? "Order deleted successfully." : "Order was not deleted.",
    });
  } catch (error) {
    return next(error);
  }
};
