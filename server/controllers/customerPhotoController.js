import crypto from "node:crypto";
import path from "node:path";
import { unlink } from "node:fs/promises";
import cloudinary from "../config/cloudinary.js";
import { CustomerPhoto } from "../models/CustomerPhoto.js";
import { Product } from "../models/Product.js";
import { CUSTOMER_PHOTO_DISK_DIR } from "../middleware/customerPhotoUpload.js";
import { signPhotoLink, verifyPhotoLink } from "../services/customerPhotoLinks.js";

const isCloudinaryFile = (file) => Boolean(file?.path && /^https?:\/\//i.test(file.path));

// A file that was stored but can't be used (wrong product) is removed again,
// so refused uploads don't pile up in storage.
const discardStoredFile = async (file) => {
  if (!file) return;
  try {
    if (isCloudinaryFile(file)) {
      if (file.filename) await cloudinary.uploader.destroy(file.filename, { type: file.deliveryType || "private" });
    } else if (file.path) {
      await unlink(file.path);
    }
  } catch (error) {
    console.error("Couldn't remove a refused customer photo:", error.message);
  }
};

export const postCustomerPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Choose a photo to upload." });
    }

    const productId = typeof req.body.productId === "string" ? req.body.productId.trim() : "";
    const product = productId ? await Product.findOne({ id: productId }).lean() : null;

    if (!product || product.status !== "active" || !product.photoUpload) {
      await discardStoredFile(req.file);
      return res.status(400).json({ message: "This product doesn't take a photo." });
    }

    const photo = await CustomerPhoto.create({
      id: crypto.randomUUID(),
      productId,
      customerId: req.customer?.id || "",
      storage: isCloudinaryFile(req.file) ? "cloudinary" : "disk",
      storageId: req.file.filename || "",
      format:
        req.file.format ||
        path
          .extname(req.file.originalname || "")
          .slice(1)
          .toLowerCase(),
      isPrivate: true,
      originalName: String(req.file.originalname || "").slice(0, 200),
      bytes: req.file.size || 0,
    });

    // No link comes back: the photo is private. The customer's browser shows
    // its own copy of the file they picked.
    return res.status(201).json({ photo: { id: photo.id, name: photo.originalName } });
  } catch (error) {
    await discardStoredFile(req.file);
    return next(error);
  }
};

/** Admin only: a time-limited link to open one customer photo. */
export const getCustomerPhotoLink = async (req, res, next) => {
  try {
    const photo = await CustomerPhoto.findOne({ id: req.params.id }).lean();
    if (!photo) {
      return res.status(404).json({ message: "Photo not found." });
    }
    const { url, expiresAt } = signPhotoLink(photo.id);
    return res.json({ url, expiresAt, name: photo.originalName });
  } catch (error) {
    return next(error);
  }
};

/** Opens a photo from a signed link, until the link expires. */
export const viewCustomerPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { expires, sig } = req.query;
    if (!verifyPhotoLink(id, expires, sig)) {
      return res.status(403).json({ message: "This photo link has expired. Open it again from the order." });
    }

    const photo = await CustomerPhoto.findOne({ id }).lean();
    if (!photo) {
      return res.status(404).json({ message: "Photo not found." });
    }

    // Never cached publicly or indexed, and usable in the admin page's <img>
    // even when the admin runs on another origin (local development).
    res.set({
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex, nofollow",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    if (photo.isPrivate && photo.storage === "cloudinary") {
      // Cloudinary's own signed download link, expiring with ours.
      const downloadUrl = cloudinary.utils.private_download_url(photo.storageId, photo.format || "jpg", {
        resource_type: "image",
        type: "private",
        expires_at: Number(expires),
      });
      return res.redirect(302, downloadUrl);
    }

    if (photo.isPrivate && photo.storage === "disk") {
      const dir = path.resolve(process.cwd(), CUSTOMER_PHOTO_DISK_DIR);
      const file = path.resolve(dir, photo.storageId);
      if (!file.startsWith(dir + path.sep)) {
        return res.status(404).json({ message: "Photo not found." });
      }
      return res.sendFile(file, (error) => {
        if (error && !res.headersSent) res.status(404).json({ message: "Photo not found." });
      });
    }

    // Uploaded before photos were private: still at its old address.
    if (photo.url) {
      return res.redirect(302, photo.url);
    }
    return res.status(404).json({ message: "Photo not found." });
  } catch (error) {
    return next(error);
  }
};
