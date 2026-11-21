import { Router } from "express";
import { getCurrentAuthUser } from "../controllers/authController.js";
import {
  createAdminProduct,
  deleteAdminOrder,
  deleteAdminProduct,
  getAdminOrder,
  getAdminOrders,
  getAdminProducts,
  getAdminUsers,
  postAdminProductImages,
  updateAdminOrder,
  updateAdminProduct,
} from "../controllers/adminController.js";
import { getAdminReviews, patchAdminReview } from "../controllers/reviewController.js";
import { createHsnCode, deleteHsnCode, listHsnCodes, updateHsnCode } from "../controllers/hsnController.js";
import { authenticateRequest } from "../middleware/authenticateRequest.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { uploadProductImages } from "../middleware/productImageUpload.js";
import { requireDurableStorage } from "../config/uploadStorage.js";

const router = Router();

router.use(authenticateRequest, authorizeRoles("admin"));

router.get("/me", getCurrentAuthUser);
router.get("/orders", getAdminOrders);
router.get("/orders/:id", getAdminOrder);
router.put("/orders/:id", updateAdminOrder);
router.delete("/orders/:id", deleteAdminOrder);
router.get("/users", getAdminUsers);
router.get("/products", getAdminProducts);
router.post("/products", createAdminProduct);
// The durability guard runs BEFORE multer, so a file that can't be kept is
// never read off the wire in the first place.
router.post("/products/images", requireDurableStorage, uploadProductImages, postAdminProductImages);
router.put("/products/:id", updateAdminProduct);
router.delete("/products/:id", deleteAdminProduct);
// Review moderation: list (optionally ?status=pending) and approve/reject.
router.get("/reviews", getAdminReviews);
router.patch("/reviews/:reviewId", patchAdminReview);
// HSN/SAC codes and their GST rates (see models/HsnCode.js).
router.get("/hsn-codes", listHsnCodes);
router.post("/hsn-codes", createHsnCode);
router.put("/hsn-codes/:id", updateHsnCode);
router.delete("/hsn-codes/:id", deleteHsnCode);

export default router;
