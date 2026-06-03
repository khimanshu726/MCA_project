import { getOrder, getOrders, updateOrder, deleteOrder } from "./orderController.js";
import { listUsers } from "../services/userStore.js";
import { createProductRecord } from "../services/productStore.js";
import { mapUserForClient } from "../utils/authHelpers.js";

const hasProductValidationErrors = (errors) => Object.values(errors).some(Boolean);

const validateProductPayload = ({ name, description, category, imageUrl, basePrice } = {}) => {
  const errors = {};

  if (!name?.trim()) {
    errors.name = "Product name is required.";
  }

  if (!description?.trim()) {
    errors.description = "Product description is required.";
  }

  if (!category?.trim()) {
    errors.category = "Product category is required.";
  }

  if (!imageUrl?.trim()) {
    errors.imageUrl = "Product image URL is required.";
  }

  if (!Number.isFinite(Number(basePrice)) || Number(basePrice) <= 0) {
    errors.basePrice = "Base price must be greater than zero.";
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
    const product = await createProductRecord(payload);

    return res.status(201).json({
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    return next(error);
  }
};
