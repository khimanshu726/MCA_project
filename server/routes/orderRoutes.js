import { Router } from "express";
import {
  cancelCustomerOrder,
  cancelPendingPayment,
  createOrder,
  getCustomerOrder,
  getCustomerOrders,
  returnCustomerOrder,
  verifyPayment,
} from "../controllers/orderController.js";
import {
  authenticateCustomer,
  optionalAuthenticateCustomer,
} from "../middleware/authenticateCustomer.js";
import { uploadOrderDesignFile } from "../middleware/orderUpload.js";
import { rejectFileWhenStorageNotDurable } from "../config/uploadStorage.js";

const router = Router();

// Customer checkout (COD or online). Uses optional customer token to link orders to accounts.
router.post("/", uploadOrderDesignFile, rejectFileWhenStorageNotDurable, optionalAuthenticateCustomer, createOrder);

// Razorpay signature verification (backwards-compatible route).
router.post("/verify-payment", verifyPayment);

// Customer order history.
router.get("/customer", authenticateCustomer, getCustomerOrders);

// Single order lookup for the order-success/detail pages — ownership
// checked in the controller (see getCustomerOrder), auth optional so guest
// orders remain reachable by id.
router.get("/customer/:id", optionalAuthenticateCustomer, getCustomerOrder);

// Customer self-service actions — same ownership rule as the lookup above
// (guest orders reachable by id, authenticated orders scoped to the owner).
router.post("/customer/:id/cancel", optionalAuthenticateCustomer, cancelCustomerOrder);
router.post("/customer/:id/return", optionalAuthenticateCustomer, returnCustomerOrder);
// Bail out of an unpaid online checkout: releases reserved stock and marks
// the PaymentPending order PaymentFailed (see cancelPendingPayment).
router.post("/customer/:id/cancel-payment", optionalAuthenticateCustomer, cancelPendingPayment);

export default router;

