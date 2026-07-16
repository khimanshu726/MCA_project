import mongoose from "mongoose";
import {
  MAX_DESIGNS_PER_CUSTOMER,
  countDesigns,
  createDesign,
  deleteDesign,
  duplicateDesign,
  getDesign,
  listDesigns,
  updateDesign,
} from "../services/designStore.js";
import { createUploadedFileUrl } from "../utils/orderHelpers.js";

// Caps are enforced here (not in the schema) so the error message can be
// actionable. State carries every layer transform; previews are small
// JPEG data URLs rendered client-side at card size.
const MAX_STATE_BYTES = 1.5 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 500 * 1024;

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const validateDesignPayload = ({ name, state, previewImage }, { requireAll }) => {
  if (requireAll || name !== undefined) {
    if (!name || typeof name !== "string" || !name.trim()) {
      return "A design name is required.";
    }
  }

  if (requireAll || state !== undefined) {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return "Design state must be an object.";
    }
    if (JSON.stringify(state).length > MAX_STATE_BYTES) {
      return "Design state is too large to save.";
    }
  }

  if (previewImage !== undefined && typeof previewImage === "string" && previewImage.length > MAX_PREVIEW_BYTES) {
    return "Design preview image is too large.";
  }

  return null;
};

const mapDesignSummary = (design) => ({
  id: design._id.toString(),
  name: design.name,
  productId: design.productId,
  productName: design.productName,
  templateId: design.templateId,
  previewImage: design.previewImage,
  createdAt: design.createdAt,
  updatedAt: design.updatedAt,
});

const mapDesignFull = (design) => ({
  ...mapDesignSummary(design),
  state: design.state,
});

export const getDesigns = async (req, res, next) => {
  try {
    const designs = await listDesigns(req.customer.id);
    return res.json({ items: designs.map(mapDesignSummary) });
  } catch (error) {
    return next(error);
  }
};

export const getDesignById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Design not found." });
    }

    const design = await getDesign(req.customer.id, req.params.id);
    if (!design) {
      return res.status(404).json({ message: "Design not found." });
    }

    return res.json(mapDesignFull(design));
  } catch (error) {
    return next(error);
  }
};

export const postDesign = async (req, res, next) => {
  try {
    const { productId, productName, templateId, name, state, previewImage } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId is required." });
    }

    const validationError = validateDesignPayload({ name, state, previewImage }, { requireAll: true });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existingCount = await countDesigns(req.customer.id);
    if (existingCount >= MAX_DESIGNS_PER_CUSTOMER) {
      return res.status(409).json({
        message: `You can save up to ${MAX_DESIGNS_PER_CUSTOMER} designs. Delete an old design to save a new one.`,
      });
    }

    const design = await createDesign(req.customer.id, {
      productId,
      productName: productName || "",
      templateId: templateId || "",
      name: name.trim(),
      state,
      previewImage: previewImage || "",
    });

    return res.status(201).json(mapDesignFull(design));
  } catch (error) {
    return next(error);
  }
};

export const putDesign = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Design not found." });
    }

    const { name, state, previewImage, productId, productName, templateId } = req.body;

    const validationError = validateDesignPayload({ name, state, previewImage }, { requireAll: false });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const design = await updateDesign(req.customer.id, req.params.id, {
      name: name === undefined ? undefined : name.trim(),
      state,
      previewImage,
      productId,
      productName,
      templateId,
    });

    if (!design) {
      return res.status(404).json({ message: "Design not found." });
    }

    return res.json(mapDesignFull(design));
  } catch (error) {
    return next(error);
  }
};

export const postDuplicateDesign = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Design not found." });
    }

    const existingCount = await countDesigns(req.customer.id);
    if (existingCount >= MAX_DESIGNS_PER_CUSTOMER) {
      return res.status(409).json({
        message: `You can save up to ${MAX_DESIGNS_PER_CUSTOMER} designs. Delete an old design to duplicate this one.`,
      });
    }

    const copy = await duplicateDesign(req.customer.id, req.params.id);
    if (!copy) {
      return res.status(404).json({ message: "Design not found." });
    }

    return res.status(201).json(mapDesignFull(copy));
  } catch (error) {
    return next(error);
  }
};

export const deleteDesignById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Design not found." });
    }

    const deleted = await deleteDesign(req.customer.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Design not found." });
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};

// Studio image uploads (multipart, field "asset"). Returns a URL the editor
// stores in layer state, so saved designs reference assets instead of
// embedding megabytes of base64.
export const postDesignAsset = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "An image file is required." });
  }

  return res.status(201).json({ url: createUploadedFileUrl(req, req.file) });
};
