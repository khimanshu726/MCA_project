import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "../services/addressStore.js";

const REQUIRED_FIELDS = ["fullName", "phoneNumber", "pincode", "addressLine1", "city", "state"];

const validateAddressPayload = (body) => {
  const missing = REQUIRED_FIELDS.filter((field) => !String(body[field] || "").trim());
  if (missing.length > 0) {
    return `Missing required field(s): ${missing.join(", ")}.`;
  }
  if (!/^\d{6}$/.test(String(body.pincode).trim())) {
    return "Pincode must be a 6-digit number.";
  }
  return null;
};

const pickAddressFields = (body) => ({
  fullName: String(body.fullName).trim(),
  phoneNumber: String(body.phoneNumber).trim(),
  pincode: String(body.pincode).trim(),
  addressLine1: String(body.addressLine1).trim(),
  addressLine2: String(body.addressLine2 || "").trim(),
  landmark: String(body.landmark || "").trim(),
  city: String(body.city).trim(),
  district: String(body.district || "").trim(),
  state: String(body.state).trim(),
  addressType: ["home", "office", "other"].includes(body.addressType) ? body.addressType : "home",
  isDefault: Boolean(body.isDefault),
});

export const getAddresses = async (req, res, next) => {
  try {
    const addresses = await listAddresses(req.customer.id);
    return res.json({ addresses });
  } catch (error) {
    return next(error);
  }
};

export const createAddressHandler = async (req, res, next) => {
  try {
    const validationError = validateAddressPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const address = await createAddress(req.customer.id, pickAddressFields(req.body));
    return res.status(201).json({ address });
  } catch (error) {
    return next(error);
  }
};

export const updateAddressHandler = async (req, res, next) => {
  try {
    const validationError = validateAddressPayload({ ...req.body });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const address = await updateAddress(req.customer.id, req.params.id, pickAddressFields(req.body));
    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }
    return res.json({ address });
  } catch (error) {
    return next(error);
  }
};

export const deleteAddressHandler = async (req, res, next) => {
  try {
    const address = await deleteAddress(req.customer.id, req.params.id);
    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }
    return res.json({ address });
  } catch (error) {
    return next(error);
  }
};

export const setDefaultAddressHandler = async (req, res, next) => {
  try {
    const address = await setDefaultAddress(req.customer.id, req.params.id);
    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }
    return res.json({ address });
  } catch (error) {
    return next(error);
  }
};
