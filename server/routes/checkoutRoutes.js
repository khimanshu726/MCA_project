import { Router } from "express";
import { createOrder, verifyPayment } from "../controllers/orderController.js";
import { previewCheckoutPricing } from "../controllers/checkoutController.js";
import { optionalAuthenticateCustomer } from "../middleware/authenticateCustomer.js";
import { uploadOrderDesignFile } from "../middleware/orderUpload.js";
import { rejectFileWhenStorageNotDurable } from "../config/uploadStorage.js";

const router = Router();

// Frontend online checkout entrypoint.
// Creates a pending order + Razorpay order id (when paymentMethod is `upi` or `card`).
router.post("/create-order", uploadOrderDesignFile, rejectFileWhenStorageNotDurable, optionalAuthenticateCustomer, createOrder);

// Stateless pricing/coupon preview for a proposed basket. Used by the Buy Now
// checkout, which has no server cart to apply a coupon against. Holds no
// authority — /create-order re-validates everything independently.
router.post("/checkout/preview", previewCheckoutPricing);

// Razorpay signature verification endpoint (preferred).
router.post("/verify-payment", verifyPayment);

export default router;

