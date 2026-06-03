import crypto from "node:crypto";
import { appConfig } from "../config.js";
import { normalizeEmail, normalizeMobile } from "../utils/authHelpers.js";
import { User } from "../models/User.js";

export const listUsers = async () => {
  const users = await User.find({}).sort({ createdAt: -1 });
  return users.map((user) => user.toObject());
};

export const findUserById = async (id) => {
  const user = await User.findOne({ id });
  return user ? user.toObject() : null;
};

export const findUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const user = await User.findOne({ email: new RegExp(`^${normalizedEmail}$`, "i") });
  return user ? user.toObject() : null;
};

export const findUserByMobile = async (mobile) => {
  const normalizedMobile = normalizeMobile(mobile);
  if (!normalizedMobile) return null;
  const user = await User.findOne({ mobile: normalizedMobile });
  return user ? user.toObject() : null;
};

export const findUserByIdentifier = async (identifier) => {
  const normalizedIdentifier = String(identifier || "").trim();

  if (!normalizedIdentifier) {
    return null;
  }

  if (normalizedIdentifier.includes("@")) {
    return findUserByEmail(normalizedIdentifier);
  }

  return findUserByMobile(normalizedIdentifier);
};

export const hasDuplicateUser = async ({ email, mobile }, ignoreUserId = "") => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizeMobile(mobile);

  const query = { $or: [] };

  if (normalizedEmail) {
    query.$or.push({ email: new RegExp(`^${normalizedEmail}$`, "i") });
  }

  if (normalizedMobile) {
    query.$or.push({ mobile: normalizedMobile });
  }

  if (query.$or.length === 0) return false;

  if (ignoreUserId) {
    query.id = { $ne: ignoreUserId };
  }

  const existing = await User.findOne(query);
  return !!existing;
};

export const createUserRecord = async (payload) => {
  const user = new User({
    id: crypto.randomUUID(),
    email: payload.email?.trim().toLowerCase() || "",
    mobile: payload.mobile?.trim() || "",
    password: payload.password || "",
    provider: payload.provider || "email",
    profileImage: payload.profileImage || "",
    role: payload.role || "admin",
  });

  await user.save();
  return user.toObject();
};

export const updateUserRecord = async (id, updater) => {
  const currentUser = await User.findOne({ id });

  if (!currentUser) {
    return null;
  }

  const plainUser = currentUser.toObject();
  const nextUser = typeof updater === "function" ? updater(plainUser) : { ...plainUser, ...updater };

  delete nextUser._id;

  const updated = await User.findOneAndUpdate({ id }, nextUser, { new: true, runValidators: true });
  return updated ? updated.toObject() : null;
};

export const ensureDefaultAdminUser = async () => {
  const existingUser =
    (await findUserByEmail(appConfig.adminEmail)) ||
    (await findUserByMobile(appConfig.adminPhone));

  if (existingUser) {
    return existingUser;
  }

  return createUserRecord({
    email: appConfig.adminEmail,
    mobile: appConfig.adminPhone,
    password: appConfig.adminPasswordHash,
    provider: "email",
    role: "admin",
  });
};
