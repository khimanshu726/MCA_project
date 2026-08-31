import { Router } from "express";
import {
  getFrequentlyBoughtTogetherHandler,
  getProductDetail,
  getProducts,
} from "../controllers/productController.js";
import {
  getProductReviews,
  getReviewEligibilityHandler,
  postProductReview,
} from "../controllers/reviewController.js";
import { authenticateCustomer } from "../middleware/authenticateCustomer.js";

const router = Router();

router.get("/", getProducts);
router.get("/:id/frequently-bought-together", getFrequentlyBoughtTogetherHandler);
// Reviews: public list + summary; submitting and the eligibility check are
// customer-authenticated (verified-buyer gating lives in reviewStore).
router.get("/:id/reviews", getProductReviews);
router.get("/:id/reviews/eligibility", authenticateCustomer, getReviewEligibilityHandler);
router.post("/:id/reviews", authenticateCustomer, postProductReview);
router.get("/:id", getProductDetail);

export default router;
