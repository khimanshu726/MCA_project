import { Router } from "express";
import {
  createOrder,
  getCustomerOrders,
  verifyPayment,
} from "../controllers/orderController.js";
import {
  authenticateCustomer,
  optionalAuthenticateCustomer,
} from "../middleware/authenticateCustomer.js";
import { uploadOrderDesignFile } from "../middleware/orderUpload.js";

const router = Router();

// Customer checkout (COD or online). Uses optional customer token to link orders to accounts.
router.post("/", uploadOrderDesignFile, optionalAuthenticateCustomer, createOrder);

// Razorpay signature verification (backwards-compatible route).
router.post("/verify-payment", verifyPayment);

// Customer order history.
router.get("/customer", authenticateCustomer, getCustomerOrders);

export default router;

