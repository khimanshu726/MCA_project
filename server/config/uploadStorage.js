import multer from "multer";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

/**
 * One owner for "where do uploaded files go".
 *
 * This logic was copy-pasted between orderUpload.js and designAssetUpload.js,
 * and both quietly fell back to local disk when Cloudinary wasn't configured.
 * That's fine on a laptop and destructive on Render, whose filesystem is
 * ephemeral: every redeploy wipes it. Customer artwork attached to a real,
 * paid order was being written somewhere guaranteed to be erased, with nothing
 * anywhere reporting it.
 *
 * So the driver choice lives here, it is reported by /api/health, and in
 * production a non-durable upload is refused rather than accepted and lost.
 * A 503 an admin can see beats a file that silently evaporates next deploy.
 */

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
  );

export const getUploadDriver = () => (isCloudinaryConfigured() ? "cloudinary" : "disk");

/**
 * Durable = the file will still be there after a redeploy.
 *
 * Local disk qualifies in development (your machine keeps its files) and never
 * does in production, where the container's disk is thrown away.
 */
export const isUploadStorageDurable = () =>
  isCloudinaryConfigured() || process.env.NODE_ENV !== "production";

export const getUploadStorageStatus = () => ({
  driver: getUploadDriver(),
  durable: isUploadStorageDurable(),
  // Named so the operator knows which three vars to set, without exposing them.
  cloudinaryConfigured: isCloudinaryConfigured(),
});

/**
 * Blocks an upload that cannot be stored durably, instead of taking the file
 * and losing it. Only bites in production without Cloudinary — exactly the
 * configuration where the write would be pointless.
 */
const STORAGE_NOT_CONFIGURED = {
  code: "STORAGE_NOT_CONFIGURED",
  message:
    "File storage is not configured on this server, so uploads cannot be saved. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
};

export const requireDurableStorage = (_req, res, next) => {
  if (!isUploadStorageDurable()) {
    return res.status(503).json(STORAGE_NOT_CONFIGURED);
  }
  return next();
};

/**
 * The same guard for routes where the file is optional — checkout being the
 * one that matters. Attaching artwork is optional there, so refusing the whole
 * route would block every order, including cash-on-delivery ones carrying no
 * file at all. This only objects when a file was actually sent.
 *
 * Runs after multer (it needs `req.file`), so the doomed file has already been
 * written; it's removed here rather than left behind as litter.
 */
export const rejectFileWhenStorageNotDurable = async (req, res, next) => {
  if (!req.file || isUploadStorageDurable()) {
    return next();
  }

  if (req.file.path) {
    await unlink(req.file.path).catch(() => {
      // Best-effort: the response below is what matters, and on a disk Render
      // is about to erase anyway, a leftover file is the lesser problem.
    });
  }

  return res.status(503).json(STORAGE_NOT_CONFIGURED);
};

const buildFileFilter = (allowedTypes, label) => (_req, file, callback) => {
  if (allowedTypes.includes(file.mimetype)) {
    callback(null, true);
    return;
  }
  // Tagged 400: sending the wrong file type is the caller's mistake, and the
  // global error handler renders anything untagged as a 500.
  const error = new Error(`Only ${label} files are allowed.`);
  error.statusCode = 400;
  callback(error);
};

const cloudinaryFormatFor = (mimetype) =>
  ({
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
  })[mimetype] || "png";

/** Builds a multer instance for one upload purpose. */
export const createUploader = ({ folder, diskPrefix, allowedTypes, typeLabel, maxBytes = 10 * 1024 * 1024 }) => {
  const fileFilter = buildFileFilter(allowedTypes, typeLabel);

  if (isCloudinaryConfigured()) {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: async (_req, file) => {
        const baseName = file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
        return {
          folder: `elite-empressions/${folder}`,
          format: cloudinaryFormatFor(file.mimetype),
          public_id: `${Date.now()}_${baseName}`,
        };
      },
    });

    return multer({ storage, limits: { fileSize: maxBytes }, fileFilter });
  }

  const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.resolve(process.cwd(), "uploads")),
    filename: (_req, file, cb) =>
      cb(null, `${diskPrefix}-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`),
  });

  return multer({ storage: diskStorage, limits: { fileSize: maxBytes }, fileFilter });
};

/**
 * An upload middleware that builds its multer instance on first request rather
 * than at import.
 *
 * The old middlewares resolved the driver at module load, which meant the
 * choice was frozen by whatever `dotenv` had managed to read by the time the
 * import graph ran — and made it untestable, since a test can't set env vars
 * before the module it imports has already branched on them. Rebuilding when
 * the driver changes also means adding Cloudinary keys takes effect on the next
 * boot without touching code.
 */
export const createLazyUploader = ({ field, multiple = false, maxFiles = 8, ...config }) => {
  let handler = null;
  let builtForDriver = null;

  return (req, res, next) => {
    const driver = getUploadDriver();

    if (!handler || builtForDriver !== driver) {
      const uploader = createUploader(config);
      handler = multiple ? uploader.array(field, maxFiles) : uploader.single(field);
      builtForDriver = driver;
    }

    return handler(req, res, next);
  };
};

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
export const ARTWORK_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
