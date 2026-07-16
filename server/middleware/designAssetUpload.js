import multer from "multer";
import path from "node:path";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Same storage strategy as order design-file uploads
// (server/middleware/orderUpload.js), but images only — studio layers are
// raster artwork; print PDFs are generated later from the flattened design.
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const imageFileFilter = (_req, file, callback) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    callback(null, true);
    return;
  }
  callback(new Error("Only PNG, JPG, and WebP images are allowed."));
};

let upload;

if (isCloudinaryConfigured) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => {
      const baseName = file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");

      return {
        folder: "elite-empressions/designs",
        format: file.mimetype === "image/png" ? "png" : "jpg",
        public_id: `${Date.now()}_${baseName}`,
      };
    },
  });

  upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  });
} else {
  const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.resolve(process.cwd(), "uploads")),
    filename: (_req, file, cb) => {
      const uniqueName = `design-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      cb(null, uniqueName);
    },
  });

  upload = multer({
    storage: diskStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  });
}

export const uploadDesignAsset = upload.single("asset");
