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

export default router;
