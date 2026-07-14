import { getOrder, getOrders, updateOrder, deleteOrder } from "./orderController.js";
import { listUsers } from "../services/userStore.js";
import {
  createProductRecord,
  deleteProductRecord,
  listProducts,
  updateProductRecord,
} from "../services/productStore.js";
import { mapUserForClient } from "../utils/authHelpers.js";

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

const validateProductPayload = (payload = {}) => {
  const errors = {};
  const images = normalizeImages(payload.images);

  if (!payload.name?.trim()) {
    errors.name = "Product name is required.";
  }

  if (!payload.description?.trim()) {
    errors.description = "Product description is required.";
  }

  if (!payload.category?.trim()) {
    errors.category = "Product category is required.";
  }

  if (images.length === 0) {
    errors.images = "At least one product image URL is required.";
  }

  if (!Number.isFinite(Number(payload.price)) || Number(payload.price) <= 0) {
    errors.price = "Price must be greater than zero.";
  }

  if (payload.mrp !== undefined && Number(payload.mrp) < Number(payload.price)) {
    errors.mrp = "MRP cannot be less than price.";
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
    return next(error);
  }
};

export const updateAdminProduct = async (req, res, next) => {
  const payload = req.body || {};
  const updates = { ...payload };

  if (payload.images !== undefined) {
    updates.images = normalizeImages(payload.images);
  }

  try {
    const product = await updateProductRecord(req.params.id, updates);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json({
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    return next(error);
  }
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
