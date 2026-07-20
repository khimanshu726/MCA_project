import { Order } from "../models/Order.js";

export const listOrders = async ({
  status,
  date,
  query,
  onlyNew = false,
  includeArchived = false,
  customerId,
} = {}) => {
  const filter = {};

  if (customerId) {
    filter.customerId = customerId;
  }

  if (!includeArchived) {
    filter.archived = false;
  }

  if (status) {
    filter.orderStatus = status;
  }

  if (date) {
    filter.createdAt = {
      $gte: new Date(`${date}T00:00:00.000Z`),
      $lte: new Date(`${date}T23:59:59.999Z`),
    };
  }

  if (onlyNew) {
    filter.notificationStatus = "Unread";
  }

  if (query) {
    filter.$or = [
      { orderId: new RegExp(query, "i") },
      { customerName: new RegExp(query, "i") },
      { phone: new RegExp(query, "i") },
      { email: new RegExp(query, "i") },
      { productName: new RegExp(query, "i") },
    ];
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 });
  return orders.map((o) => o.toObject());
};

export const getOrderById = async (id) => {
  const filter = { $or: [{ id }, { orderId: id }, { razorpayOrderId: id }] };
  const order = await Order.findOne(filter);
  return order ? order.toObject() : null;
};

export const createOrderRecord = async (orderData) => {
  const order = new Order(orderData);
  await order.save();
  return order.toObject();
};

export const updateOrderRecord = async (id, updater) => {
  const currentOrder = await Order.findOne({ $or: [{ id }, { orderId: id }, { razorpayOrderId: id }] });

  if (!currentOrder) {
    return null;
  }

  const plainOrder = currentOrder.toObject();
  const nextOrder = typeof updater === "function" ? updater(plainOrder) : { ...plainOrder, ...updater };
  delete nextOrder._id;

  const updated = await Order.findOneAndUpdate(
    { $or: [{ id }, { orderId: id }, { razorpayOrderId: id }] },
    nextOrder,
    { new: true, runValidators: true }
  );

  return updated ? updated.toObject() : null;
};

/**
 * Atomically claims the right to send a customer's order-confirmation email.
 * Returns the order (with the flag now set) to whichever caller wins, and null
 * to every other caller — so the payment-captured webhook and the client
 * verify call, which both flow through recordPaymentCaptured, can only ever
 * dispatch one confirmation. `findOneAndUpdate` is a single atomic op, so the
 * `confirmationEmailSentAt: null` guard is the mutual exclusion.
 */
export const claimOrderConfirmationEmail = async (id) => {
  const claimed = await Order.findOneAndUpdate(
    { $and: [{ $or: [{ id }, { orderId: id }, { razorpayOrderId: id }] }, { confirmationEmailSentAt: null }] },
    { $set: { confirmationEmailSentAt: new Date() } },
    { new: true }
  );
  return claimed ? claimed.toObject() : null;
};

/**
 * Releases a claim so a later attempt can retry. Used when the send itself
 * fails after the claim was taken — a transient SMTP error should not burn the
 * one confirmation the customer is owed. Razorpay retries the webhook, and the
 * client verify call can re-run, so re-opening the claim makes delivery
 * eventually-consistent rather than at-most-once.
 */
export const releaseOrderConfirmationEmailClaim = async (id) => {
  await Order.updateOne(
    { $or: [{ id }, { orderId: id }, { razorpayOrderId: id }] },
    { $set: { confirmationEmailSentAt: null } }
  );
};

export const deleteOrderRecord = async (id) => {
  const result = await Order.findOneAndDelete({ $or: [{ id }, { orderId: id }, { razorpayOrderId: id }] });
  return !!result;
};

export const bulkUpdateOrderRecords = async (ids, updater) => {
  const result = await Order.updateMany(
    { $or: [{ id: { $in: ids } }, { orderId: { $in: ids } }] },
    { $set: updater }
  );
  return result;
};

export const bulkDeleteOrderRecords = async (ids) => {
  const result = await Order.deleteMany({
    $or: [{ id: { $in: ids } }, { orderId: { $in: ids } }],
  });
  return result;
};
