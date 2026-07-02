import { Router } from "express";
import { getCurrentAuthUser } from "../controllers/authController.js";
import {
  createAdminProduct,
  deleteAdminOrder,
  getAdminOrder,
  getAdminOrders,
  getAdminUsers,
  updateAdminOrder,
} from "../controllers/adminController.js";
import { authenticateRequest } from "../middleware/authenticateRequest.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";

const router = Router();

router.use(authenticateRequest, authorizeRoles("admin"));

router.get("/me", getCurrentAuthUser);
router.get("/orders", getAdminOrders);
router.get("/orders/:id", getAdminOrder);
router.put("/orders/:id", updateAdminOrder);
router.delete("/orders/:id", deleteAdminOrder);
router.get("/users", getAdminUsers);
router.post("/products", createAdminProduct);

export default router;
