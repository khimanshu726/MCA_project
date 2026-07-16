import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  appConfig,
  hasExplicitAdminPassword,
  isProduction,
  PUBLISHED_DEFAULT_ADMIN_PASSWORD,
  resolveAdminPasswordHash,
} from "../config.js";
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

export const findUserByFirebaseUid = async (firebaseUid) => {
  if (!firebaseUid) return null;
  const user = await User.findOne({ firebaseUid });
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
    firebaseUid: payload.firebaseUid || "",
    authProvider: payload.authProvider || "local",
    provider: payload.provider || "email",
    username: payload.username || "",
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

const ADMIN_SETUP_HINT =
  "Set ADMIN_EMAIL and ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) in the environment.";

/**
 * An admin account whose password is the one committed to the repo is a login
 * for anyone who can read the repo. Boot is the only moment we can notice, so
 * it says so here — loudly, and only in the log, never over HTTP: an endpoint
 * advertising "this site still uses the default admin password" is a gift to
 * exactly the wrong reader.
 */
const warnIfAdminUsesPublishedPassword = async (adminUser) => {
  if (!isProduction() || !adminUser?.password) return;

  const usesPublishedDefault = await bcrypt
    .compare(PUBLISHED_DEFAULT_ADMIN_PASSWORD, adminUser.password)
    .catch(() => false);

  if (usesPublishedDefault) {
    console.error(
      "[admin] SECURITY: the production admin account still uses the default password " +
        "published in server/config.js, so anyone who can read the repository can sign in. " +
        ADMIN_SETUP_HINT +
        " The existing account is NOT rotated automatically — change it deliberately.",
    );
  }
};

export const ensureDefaultAdminUser = async () => {
  const existingUser =
    (await findUserByEmail(appConfig.adminEmail)) ||
    (await findUserByMobile(appConfig.adminPhone));

  if (existingUser) {
    await warnIfAdminUsesPublishedPassword(existingUser);
    return existingUser;
  }

  // Seeding a known-credential admin is a convenience for local development and
  // a backdoor in production. Refuse rather than mint one: an operator who has
  // not chosen a password has not chosen this account either.
  if (isProduction() && !hasExplicitAdminPassword()) {
    console.error(
      `[admin] Refusing to create the default admin account in production: no admin password is ` +
        `configured, and seeding one would use the password published in server/config.js. ` +
        ADMIN_SETUP_HINT,
    );
    return null;
  }

  return createUserRecord({
    email: appConfig.adminEmail,
    mobile: appConfig.adminPhone,
    password: resolveAdminPasswordHash(),
    provider: "email",
    role: "admin",
  });
};

const mapFirebaseProvider = (providerId = "") => {
  if (providerId === "google.com") return "google";
  if (providerId === "facebook.com") return "facebook";
  if (providerId === "phone") return "mobile";
  return "firebase";
};

export const upsertCustomerFromFirebaseClaims = async (decodedToken) => {
  const firebaseUid = decodedToken.uid || "";
  const email = normalizeEmail(decodedToken.email || "");
  const mobile = normalizeMobile(decodedToken.phone_number || "");
  const profileImage = decodedToken.picture || "";
  const provider = mapFirebaseProvider(decodedToken.firebase?.sign_in_provider || decodedToken.sign_in_provider || "");
  const username = decodedToken.name || "";

  let existingUser = await findUserByFirebaseUid(firebaseUid);

  if (!existingUser && (email || mobile)) {
    const query = {
      role: "customer",
      $or: [],
    };

    if (email) {
      query.$or.push({ email: new RegExp(`^${email}$`, "i") });
    }

    if (mobile) {
      query.$or.push({ mobile });
    }

    if (query.$or.length > 0) {
      const matchedUser = await User.findOne(query);
      existingUser = matchedUser ? matchedUser.toObject() : null;
    }
  }

  if (!existingUser) {
    return createUserRecord({
      email,
      mobile,
      firebaseUid,
      provider,
      authProvider: "firebase",
      username,
      profileImage,
      role: "customer",
    });
  }

  return updateUserRecord(existingUser.id, (currentUser) => ({
    ...currentUser,
    email: email || currentUser.email || "",
    mobile: mobile || currentUser.mobile || "",
    firebaseUid: firebaseUid || currentUser.firebaseUid || "",
    provider: provider || currentUser.provider || "firebase",
    authProvider: "firebase",
    username: username || currentUser.username || "",
    profileImage: profileImage || currentUser.profileImage || "",
    role: currentUser.role || "customer",
  }));
};
