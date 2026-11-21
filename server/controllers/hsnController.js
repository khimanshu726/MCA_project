import { HsnCode } from "../models/HsnCode.js";
import { Product } from "../models/Product.js";

const EDITABLE_FIELDS = ["code", "kind", "description", "rate", "priceThreshold", "rateAboveThreshold", "appliesTo", "notes"];
// Changing any of these changes what customers are charged, so the row must be
// confirmed again afterwards.
const RATE_FIELDS = ["rate", "priceThreshold", "rateAboveThreshold"];

const serialize = (row, productCount = 0) => ({
  ...(typeof row.toObject === "function" ? row.toObject() : row),
  productCount,
});

const validationErrors = (error) => {
  if (error?.name === "ValidationError") {
    return Object.fromEntries(Object.entries(error.errors).map(([field, detail]) => [field, detail.message]));
  }
  if (error?.code === 11000) {
    return { code: "That code already exists." };
  }
  return null;
};

// Only one row may be the shipping (or platform fee) code.
const ensureSingleRole = async (appliesTo, exceptId) => {
  if (!appliesTo || appliesTo === "product") return null;
  const other = await HsnCode.findOne({ appliesTo, _id: { $ne: exceptId } });
  return other ? { appliesTo: `${other.code} already covers the ${appliesTo === "shipping" ? "shipping fee" : "platform fee"}.` } : null;
};

const pick = (body) => Object.fromEntries(EDITABLE_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

export const listHsnCodes = async (_req, res, next) => {
  try {
    // Product codes first (what the owner works through), then the fee codes.
    const ROLE_ORDER = { product: 0, shipping: 1, platformFee: 2 };
    const rows = (await HsnCode.find().sort({ code: 1 })).sort(
      (a, b) => (ROLE_ORDER[a.appliesTo] ?? 9) - (ROLE_ORDER[b.appliesTo] ?? 9),
    );
    const counts = await Product.aggregate([{ $match: { hsnCode: { $ne: "" } } }, { $group: { _id: "$hsnCode", count: { $sum: 1 } } }]);
    const countByCode = new Map(counts.map((entry) => [entry._id, entry.count]));
    return res.json({ hsnCodes: rows.map((row) => serialize(row, countByCode.get(row.code) || 0)) });
  } catch (error) {
    return next(error);
  }
};

export const createHsnCode = async (req, res, next) => {
  try {
    const fields = pick(req.body || {});
    const roleError = await ensureSingleRole(fields.appliesTo);
    if (roleError) return res.status(400).json({ message: "Please correct the fields.", errors: roleError });

    const confirmed = req.body?.confirmed === true;
    const row = await HsnCode.create({ ...fields, confirmed, confirmedAt: confirmed ? new Date() : null });
    return res.status(201).json({ hsnCode: serialize(row) });
  } catch (error) {
    const errors = validationErrors(error);
    if (errors) return res.status(400).json({ message: "Please correct the fields.", errors });
    return next(error);
  }
};

export const updateHsnCode = async (req, res, next) => {
  try {
    const row = await HsnCode.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "HSN code not found." });

    const fields = pick(req.body || {});
    if (fields.code !== undefined && fields.code !== row.code && (await Product.exists({ hsnCode: row.code }))) {
      return res.status(409).json({
        message: "Products use this code. Add the new code as its own row and move the products to it instead.",
      });
    }
    const roleError = await ensureSingleRole(fields.appliesTo, row._id);
    if (roleError) return res.status(400).json({ message: "Please correct the fields.", errors: roleError });

    const rateChanged = RATE_FIELDS.some((key) => fields[key] !== undefined && Number(fields[key] ?? -1) !== Number(row[key] ?? -1));
    Object.assign(row, fields);

    if (req.body?.confirmed === true) {
      row.confirmed = true;
      row.confirmedAt = new Date();
    } else if (req.body?.confirmed === false || rateChanged) {
      row.confirmed = false;
      row.confirmedAt = null;
    }

    await row.save();
    const productCount = await Product.countDocuments({ hsnCode: row.code });
    return res.json({ hsnCode: serialize(row, productCount) });
  } catch (error) {
    const errors = validationErrors(error);
    if (errors) return res.status(400).json({ message: "Please correct the fields.", errors });
    return next(error);
  }
};

export const deleteHsnCode = async (req, res, next) => {
  try {
    const row = await HsnCode.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "HSN code not found." });

    const productCount = await Product.countDocuments({ hsnCode: row.code });
    if (productCount > 0) {
      return res.status(409).json({ message: `${productCount} product(s) use this code. Move them to another code first.` });
    }
    await row.deleteOne();
    return res.json({ message: "HSN code deleted." });
  } catch (error) {
    return next(error);
  }
};
