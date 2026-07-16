import { Router } from "express";
import { createOrder, verifyPayment } from "../controllers/orderController.js";
import { optionalAuthenticateCustomer } from "../middleware/authenticateCustomer.js";
import { uploadOrderDesignFile } from "../middleware/orderUpload.js";
import { rejectFileWhenStorageNotDurable } from "../config/uploadStorage.js";

const router = Router();

// Frontend online checkout entrypoint.
// Creates a pending order + Razorpay order id (when paymentMethod is `upi` or `card`).
router.post("/create-order", uploadOrderDesignFile, rejectFileWhenStorageNotDurable, optionalAuthenticateCustomer, createOrder);

// Razorpay signature verification endpoint (preferred).
router.post("/verify-payment", verifyPayment);

export default router;

