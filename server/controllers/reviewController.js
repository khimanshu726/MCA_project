import {
  createReview,
  getRatingSummary,
  getReviewEligibility,
  listApprovedReviews,
  listReviewsForAdmin,
  moderateReview,
} from "../services/reviewStore.js";
import { getProductById } from "../services/productStore.js";

const displayNameFor = (customer) =>
  customer?.username?.trim() || customer?.email?.split("@")[0] || "Verified buyer";

/** Public: approved reviews + rating summary for a product. */
export const getProductReviews = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const [reviews, summary] = await Promise.all([
      listApprovedReviews(productId),
      getRatingSummary(productId),
    ]);
    return res.json({ reviews, summary });
  } catch (error) {
    return next(error);
  }
};

/** Auth: whether the signed-in customer may review this product. */
export const getReviewEligibilityHandler = async (req, res, next) => {
  try {
    return res.json(await getReviewEligibility(req.customer.id, req.params.id));
  } catch (error) {
    return next(error);
  }
};

/** Auth: submit a review (verified-buyer gated, held pending moderation). */
export const postProductReview = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await getProductById(productId);
    if (!product) return res.status(404).json({ message: "Product not found." });

    const review = await createReview({
      customerId: req.customer.id,
      customerName: displayNameFor(req.customer),
      productId,
      rating: req.body.rating,
      title: req.body.title,
      body: req.body.body,
    });
    return res.status(201).json({ review });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, code: error.reason });
    return next(error);
  }
};

// --- Admin ---

export const getAdminReviews = async (req, res, next) => {
  try {
    return res.json({ reviews: await listReviewsForAdmin({ status: req.query.status }) });
  } catch (error) {
    return next(error);
  }
};

export const patchAdminReview = async (req, res, next) => {
  try {
    const review = await moderateReview(req.params.reviewId, req.body.status);
    if (!review) return res.status(404).json({ message: "Review not found." });
    return res.json({ review });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    return next(error);
  }
};
