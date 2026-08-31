import crypto from "node:crypto";
import { Review } from "../models/Review.js";
import { Order } from "../models/Order.js";

// An order doesn't count as proof of purchase in these states: never paid,
// failed, or unwound. Everything else that reached "Paid" or "Delivered" does.
const NON_QUALIFYING_STATUSES = ["Cancelled", "Returned", "Refunded", "PaymentFailed", "PaymentPending"];

const httpError = (message, statusCode, reason) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (reason) error.reason = reason;
  return error;
};

/**
 * A "verified buyer": has a non-cancelled order containing this product that is
 * either Paid (online) or Delivered (covers COD, which is collected on delivery).
 * Returns the proving order (lean) or null.
 */
export const findPurchaseOrder = async (customerId, productId) => {
  if (!customerId || !productId) return null;
  return Order.findOne({
    customerId,
    "lineItems.productId": productId,
    orderStatus: { $nin: NON_QUALIFYING_STATUSES },
    $or: [{ paymentStatus: "Paid" }, { orderStatus: "Delivered" }],
  })
    .select("orderId")
    .lean();
};

export const getReviewEligibility = async (customerId, productId) => {
  const order = await findPurchaseOrder(customerId, productId);
  if (!order) return { eligible: false, reason: "not_purchased" };

  const existing = await Review.findOne({ productId, customerId }).select("status").lean();
  if (existing) return { eligible: false, reason: "already_reviewed", status: existing.status };

  return { eligible: true, orderId: order.orderId };
};

export const serializeReview = (review) => ({
  id: review.id,
  productId: review.productId,
  customerName: review.customerName,
  rating: review.rating,
  title: review.title,
  body: review.body,
  status: review.status,
  createdAt: review.createdAt,
});

export const createReview = async ({ customerId, customerName, productId, rating, title = "", body }) => {
  const eligibility = await getReviewEligibility(customerId, productId);
  if (!eligibility.eligible) {
    throw eligibility.reason === "already_reviewed"
      ? httpError("You've already reviewed this product.", 409, "already_reviewed")
      : httpError("Only verified buyers can review this product.", 403, "not_purchased");
  }

  const numericRating = Math.round(Number(rating));
  if (!(numericRating >= 1 && numericRating <= 5)) {
    throw httpError("Rating must be a whole number from 1 to 5.", 400, "invalid_rating");
  }

  const cleanBody = String(body ?? "").trim();
  if (!cleanBody) throw httpError("Review text is required.", 400, "empty_body");

  try {
    const review = await Review.create({
      id: crypto.randomUUID(),
      productId,
      customerId,
      orderId: eligibility.orderId,
      customerName: String(customerName || "Verified buyer").trim().slice(0, 120),
      rating: numericRating,
      title: String(title || "").trim().slice(0, 120),
      body: cleanBody.slice(0, 4000),
      status: "pending",
    });
    return serializeReview(review);
  } catch (error) {
    // Unique (productId, customerId) — a race between two submits.
    if (error?.code === 11000) throw httpError("You've already reviewed this product.", 409, "already_reviewed");
    throw error;
  }
};

export const listApprovedReviews = async (productId, { limit = 50 } = {}) => {
  const reviews = await Review.find({ productId, status: "approved" })
    .sort("-createdAt")
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 100));
  return reviews.map(serializeReview);
};

/** Average + count + 1–5 distribution over APPROVED reviews only. */
export const getRatingSummary = async (productId) => {
  const rows = await Review.aggregate([
    { $match: { productId, status: "approved" } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let weighted = 0;
  for (const row of rows) {
    distribution[row._id] = row.count;
    count += row.count;
    weighted += row._id * row.count;
  }

  return { count, average: count ? Math.round((weighted / count) * 10) / 10 : 0, distribution };
};

// --- Admin moderation ---

export const listReviewsForAdmin = async ({ status, limit = 100 } = {}) => {
  const filter = status && status !== "all" ? { status } : {};
  const reviews = await Review.find(filter)
    .sort("-createdAt")
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 200));
  return reviews.map((review) => ({
    ...serializeReview(review),
    customerId: review.customerId,
    orderId: review.orderId,
    updatedAt: review.updatedAt,
  }));
};

export const moderateReview = async (id, status) => {
  if (!["approved", "rejected", "pending"].includes(status)) {
    throw httpError("Status must be approved, rejected, or pending.", 400, "invalid_status");
  }
  const review = await Review.findOneAndUpdate({ id }, { status }, { new: true });
  return review ? serializeReview(review) : null;
};
