import { Router } from "express";
import rateLimit from "express-rate-limit";
import { postCustomerPhoto } from "../controllers/customerPhotoController.js";
import { uploadCustomerPhoto } from "../middleware/customerPhotoUpload.js";
import { requireDurableStorage } from "../config/uploadStorage.js";
import { optionalAuthenticateCustomer } from "../middleware/authenticateCustomer.js";

const router = Router();

// Uploads are open to guests (checkout is), so they get their own, tighter
// limit than the general API one.
const photoUploadLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test" || Boolean(process.env.VITEST),
  message: { message: "Too many photo uploads. Please wait a few minutes and try again." },
});

// Guarded before multer: the file is the whole point of this route, so there
// is nothing to do if it can't be kept.
router.post(
  "/",
  photoUploadLimiter,
  requireDurableStorage,
  optionalAuthenticateCustomer,
  uploadCustomerPhoto,
  postCustomerPhoto,
);

export default router;
