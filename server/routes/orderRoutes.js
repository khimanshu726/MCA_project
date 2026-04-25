import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import {
  createOrder,
  deleteOrder,
  getOrder,
  getOrders,
  updateOrder,
  verifyPayment,
  getCustomerOrders,
  bulkOrderAction,
} from "../controllers/orderController.js";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";
import { authenticateCustomer, optionalAuthenticateCustomer } from "../middleware/authenticateCustomer.js";

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

let upload;

if (isCloudinaryConfigured) {
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const allowedFormats = {
        "application/pdf": "pdf",
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
      };
      
      const format = allowedFormats[file.mimetype] || "png";
      const baseName = file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
      
      return {
        folder: "elite-empressions/orders",
        format: format,
        public_id: `${Date.now()}_${baseName}`,
      };
    },
  });

  upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (allowedTypes.includes(file.mimetype)) {
        callback(null, true);
        return;
      }
      callback(new Error("Only PDF, PNG, and JPG files are allowed."));
    },
  });

  console.log("[CONFIG] File uploads → Cloudinary");
} else {
  const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.resolve(process.cwd(), "uploads")),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      cb(null, uniqueName);
    },
  });

  upload = multer({
    storage: diskStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (allowedTypes.includes(file.mimetype)) {
        callback(null, true);
        return;
      }
      callback(new Error("Only PDF, PNG, and JPG files are allowed."));
    },
  });

  console.log("[CONFIG] File uploads → Local disk (Cloudinary keys not set)");
}

const router = Router();

router.post("/", upload.single("designFile"), optionalAuthenticateCustomer, createOrder);
router.post("/verify-payment", verifyPayment);
router.put("/bulk", authenticateAdmin, bulkOrderAction);
router.get("/customer", authenticateCustomer, getCustomerOrders);
router.get("/", authenticateAdmin, getOrders);
router.get("/:id", authenticateAdmin, getOrder);
router.put("/:id", authenticateAdmin, updateOrder);
router.delete("/:id", authenticateAdmin, deleteOrder);

export default router;
