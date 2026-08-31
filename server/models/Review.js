import mongoose from "mongoose";

/**
 * A product review from a verified buyer, held for moderation.
 *
 * Trust model: a review can only be created by a customer who actually bought
 * the product (enforced in reviewStore.createReview against the Order
 * collection), and it stays `pending` until an admin approves it. Only
 * `approved` reviews are ever shown publicly or counted toward a product's
 * average rating — which is what lets the storefront emit an honest
 * `aggregateRating` in the Product schema rather than a fabricated one.
 */
const reviewSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    productId: { type: String, required: true, index: true },
    customerId: { type: String, required: true },
    // The order that proves the purchase, kept for moderation/audit.
    orderId: { type: String, default: "" },
    // Display name captured at review time (the account name can change later).
    customerName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "", trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

// One review per customer per product — a unique index makes a second attempt a
// clean 11000 the service turns into "you've already reviewed this".
reviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1 });

export const Review = mongoose.model("Review", reviewSchema);
