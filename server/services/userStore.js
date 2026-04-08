import crypto from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { appConfig } from "../config.js";
import { normalizeEmail, normalizeMobile } from "../utils/authHelpers.js";

const usersFilePath = path.resolve(process.cwd(), "server", "data", "users.json");

const ensureUsersFile = async () => {
  await mkdir(path.dirname(usersFilePath), { recursive: true });

  try {
    await access(usersFilePath);
  } catch {
    await writeFile(usersFilePath, "[]", "utf8");
  }
};

const readUsers = async () => {
  await ensureUsersFile();
  const rawValue = await readFile(usersFilePath, "utf8");

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const writeUsers = async (users) => {
  await ensureUsersFile();
  await writeFile(usersFilePath, JSON.stringify(users, null, 2), "utf8");
};

export const findUserById = async (id) => {
  const users = await readUsers();
  return users.find((user) => user.id === id) ?? null;
};

export const findUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const users = await readUsers();
  return users.find((user) => normalizeEmail(user.email) === normalizedEmail) ?? null;
};

export const findUserByMobile = async (mobile) => {
  const normalizedMobile = normalizeMobile(mobile);
  const users = await readUsers();
  return users.find((user) => normalizeMobile(user.mobile) === normalizedMobile) ?? null;
};

export const hasDuplicateUser = async ({ email, mobile }, ignoreUserId = "") => {
  const users = await readUsers();
  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizeMobile(mobile);

  return users.some((user) => {
    if (ignoreUserId && user.id === ignoreUserId) {
      return false;
    }

    return (
      (normalizedEmail && normalizeEmail(user.email) === normalizedEmail) ||
      (normalizedMobile && normalizeMobile(user.mobile) === normalizedMobile)
    );
  });
};

export const createUserRecord = async (payload) => {
  const users = await readUsers();
  const user = {
    id: crypto.randomUUID(),
    email: payload.email?.trim().toLowerCase() || "",
    mobile: payload.mobile?.trim() || "",
    password: payload.password || "",
    provider: payload.provider || "email",
    profileImage: payload.profileImage || "",
    role: payload.role || "admin",
    createdAt: new Date().toISOString(),
  };

  users.unshift(user);
  await writeUsers(users);
  return user;
};

export const updateUserRecord = async (id, updater) => {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    return null;
  }

  const currentUser = users[index];
  const nextUser = typeof updater === "function" ? updater(currentUser) : { ...currentUser, ...updater };
  users[index] = nextUser;
  await writeUsers(users);
  return nextUser;
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
