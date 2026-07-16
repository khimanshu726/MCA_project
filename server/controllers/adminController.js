import { getOrder, getOrders, updateOrder, deleteOrder } from "./orderController.js";
import { listUsers } from "../services/userStore.js";
import {
  createProductRecord,
  deleteProductRecord,
  listProducts,
  updateProductRecord,
} from "../services/productStore.js";
import { mapUserForClient } from "../utils/authHelpers.js";
import { createUploadedFileUrl } from "../utils/orderHelpers.js";

const hasProductValidationErrors = (errors) => Object.values(errors).some(Boolean);

const normalizeImages = (images) => {
  if (Array.isArray(images)) {
    return images.map((image) => String(image).trim()).filter(Boolean);
  }

  if (typeof images === "string") {
    return images
      .split(",")
      .map((image) => image.trim())
      .filter(Boolean);
  }

  return [];
};

// `partial` (update) validates only the fields present in the payload, so an
// edit that touches stock alone isn't rejected for "missing name". A full
// create validates everything. Either way, a field that IS present must be
// valid — an update can't blank out a required field.
const validateProductPayload = (payload = {}, { partial = false } = {}) => {
  const errors = {};
  const has = (key) => payload[key] !== undefined;
  const required = (key) => !partial || has(key);

  if (required("name") && !payload.name?.trim()) {
    errors.name = "Product name is required.";
  }

  if (required("description") && !payload.description?.trim()) {
    errors.description = "Product description is required.";
  }

  if (required("category") && !payload.category?.trim()) {
    errors.category = "Product category is required.";
  }

  if (required("images") && normalizeImages(payload.images).length === 0) {
    errors.images = "At least one product image URL is required.";
  }

  if (required("price") && (!Number.isFinite(Number(payload.price)) || Number(payload.price) <= 0)) {
    errors.price = "Price must be greater than zero.";
  }

  // When both are present we can compare directly; when only one changes, the
  // model's pre('validate') hook enforces price ≤ mrp against the stored value.
  if (has("mrp") && has("price") && Number(payload.mrp) < Number(payload.price)) {
    errors.mrp = "MRP cannot be less than price.";
  }

  if (has("stock")) {
    const stock = Number(payload.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      errors.stock = "Stock must be a whole number of zero or more.";
    }
  }

  if (has("minimumOrderQty")) {
    const moq = Number(payload.minimumOrderQty);
    if (!Number.isInteger(moq) || moq < 1) {
      errors.minimumOrderQty = "Minimum order quantity must be at least 1.";
    }
  }

  if (has("status") && !["active", "draft", "archived"].includes(payload.status)) {
    errors.status = "Status must be active, draft, or archived.";
  }

  return errors;
};

// Mongoose ValidationErrors (e.g. the price ≤ mrp rule, which only fires on
// save) should read to the admin as a 400 with per-field messages, not a 500.
const mapMongooseValidationError = (error) => {
  if (error?.name !== "ValidationError" || !error.errors) {
    return null;
  }

  const errors = {};
  for (const [field, detail] of Object.entries(error.errors)) {
    errors[field] = detail.message;
  }
  return errors;
};

export const getAdminOrders = getOrders;
export const getAdminOrder = getOrder;
export const updateAdminOrder = updateOrder;
export const deleteAdminOrder = deleteOrder;

export const getAdminUsers = async (_req, res, next) => {
  try {
    const users = await listUsers();

    return res.json({
      users: users.map((user) => mapUserForClient(user)),
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminProducts = async (req, res, next) => {
  try {
    const result = await listProducts({
      category: req.query.category,
      q: req.query.q,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
      includeInactive: true,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const createAdminProduct = async (req, res, next) => {
  const payload = req.body || {};
  const errors = validateProductPayload(payload);

  if (hasProductValidationErrors(errors)) {
    return res.status(400).json({
      message: "Please correct the product fields.",
      errors,
    });
  }

  try {
    const product = await createProductRecord({
      ...payload,
      images: normalizeImages(payload.images),
      source: "admin",
    });

    return res.status(201).json({
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    const validationErrors = mapMongooseValidationError(error);
    if (validationErrors) {
      return res.status(400).json({ message: "Please correct the product fields.", errors: validationErrors });
    }
    return next(error);
  }
};

export const updateAdminProduct = async (req, res, next) => {
  const payload = req.body || {};
  const errors = validateProductPayload(payload, { partial: true });

  if (hasProductValidationErrors(errors)) {
    return res.status(400).json({
      message: "Please correct the product fields.",
      errors,
    });
  }

  const updates = { ...payload };
  if (payload.images !== undefined) {
    updates.images = normalizeImages(payload.images);
  }

  try {
    // updateProductRecord whitelists the writable fields, so id/slug/source
    // can't be changed even if the payload carries them.
    const product = await updateProductRecord(req.params.id, updates);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json({
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    const validationErrors = mapMongooseValidationError(error);
    if (validationErrors) {
      return res.status(400).json({ message: "Please correct the product fields.", errors: validationErrors });
    }
    return next(error);
  }
};

/**
 * Product photo uploads. Returns the stored URLs; the admin then saves them
 * onto the product like any other field, so an upload that is never saved
 * costs an orphaned file and nothing else.
 *
 * Deliberately does not write to the product itself: photos are picked,
 * reordered, and removed before saving, and a half-uploaded gallery shouldn't
 * mutate a live catalog row.
 */
export const postAdminProductImages = (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({ message: "At least one image file is required." });
  }

  return res.status(201).json({
    images: req.files.map((file) => createUploadedFileUrl(req, file)),
  });
};

export const deleteAdminProduct = async (req, res, next) => {
  try {
    const wasDeleted = await deleteProductRecord(req.params.id);

    if (!wasDeleted) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json({ message: "Product deleted successfully." });
  } catch (error) {
    return next(error);
  }
};
