import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import crypto from "node:crypto";
import {
  createOrder,
  deleteOrder,
  getOrder,
  getOrders,
  updateOrder,
} from "../controllers/orderController.js";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";

const uploadRoot = path.resolve(process.cwd(), "uploads", "orders");

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    await mkdir(uploadRoot, { recursive: true });
    callback(null, uploadRoot);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only PDF, PNG, and JPG files are allowed."));
  },
});

const router = Router();

router.post("/", upload.single("designFile"), createOrder);
router.get("/", authenticateAdmin, getOrders);
router.get("/:id", authenticateAdmin, getOrder);
router.put("/:id", authenticateAdmin, updateOrder);
router.delete("/:id", authenticateAdmin, deleteOrder);

export default router;
