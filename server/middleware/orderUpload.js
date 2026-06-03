import multer from "multer";
import path from "node:path";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

let upload;

if (isCloudinaryConfigured) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => {
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
        format,
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

  console.log("[CONFIG] File uploads -> Cloudinary");
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

  console.log("[CONFIG] File uploads -> Local disk (Cloudinary keys not set)");
}

export const uploadOrderDesignFile = upload.single("designFile");

