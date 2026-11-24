import crypto from "node:crypto";
import { unlink } from "node:fs/promises";
import cloudinary from "../config/cloudinary.js";
import { CustomerPhoto } from "../models/CustomerPhoto.js";
import { Product } from "../models/Product.js";
import { createUploadedFileUrl } from "../utils/orderHelpers.js";

// A file that was stored but can't be used (wrong product) is removed again,
// so refused uploads don't pile up in storage.
const discardStoredFile = async (file) => {
  if (!file) return;
  try {
    if (file.path && /^https?:\/\//i.test(file.path)) {
      if (file.filename) await cloudinary.uploader.destroy(file.filename);
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
      url: createUploadedFileUrl(req, req.file),
      storageId: req.file.filename || "",
      originalName: String(req.file.originalname || "").slice(0, 200),
      bytes: req.file.size || 0,
    });

    return res.status(201).json({
      photo: { id: photo.id, url: photo.url, name: photo.originalName },
    });
  } catch (error) {
    await discardStoredFile(req.file);
    return next(error);
  }
};
