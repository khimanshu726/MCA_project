import jwt from "jsonwebtoken";
import { appConfig } from "../config.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^\d{10}$/;

export const normalizeEmail = (value = "") => value.trim().toLowerCase();
export const normalizeMobile = (value = "") => value.replace(/\D/g, "").slice(0, 10);

export const detectLoginType = (identifier = "") => {
  const trimmedValue = identifier.trim();

  if (!trimmedValue) {
    return "unknown";
  }

  if (trimmedValue.includes("@") && emailPattern.test(trimmedValue.toLowerCase())) {
    return "email";
  }

  if (mobilePattern.test(normalizeMobile(trimmedValue)) && normalizeMobile(trimmedValue) === trimmedValue) {
    return "mobile";
  }

  return "unknown";
};

export const issueAuthToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      role: user.role || "admin",
      email: user.email || "",
      mobile: user.mobile || "",
      provider: user.provider || "email",
    },
    appConfig.jwtSecret,
    { expiresIn: "8h" },
  );

export const mapUserForClient = (user) => ({
  id: user.id,
  email: user.email || "",
  mobile: user.mobile || "",
  provider: user.provider || "email",
  profileImage: user.profileImage || "",
  role: user.role || "admin",
  createdAt: user.createdAt,
});

export const validateEmailRegistrationPayload = ({ identifier, password }) => {
  const errors = {};
  const loginType = detectLoginType(identifier);

  if (loginType !== "email") {
    errors.identifier = "Enter a valid email address for email registration.";
  }

  if (!password?.trim()) {
    errors.password = "Password is required for email registration.";
  } else if (password.trim().length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
};

export const validateLoginPayload = ({ identifier, password }) => {
  const errors = {};
  const loginType = detectLoginType(identifier);

  if (loginType === "unknown") {
    errors.identifier = "Enter a valid email address or 10-digit mobile number.";
  }

  if (loginType === "email" && !password?.trim()) {
    errors.password = "Password is required for email login.";
  }

  return {
    errors,
    loginType,
  };
};

export const validateOtpPayload = ({ mobile, otp }) => {
  const errors = {};
  const normalizedMobile = normalizeMobile(mobile);

  if (!mobilePattern.test(normalizedMobile)) {
    errors.mobile = "Enter a valid 10-digit mobile number.";
  }

  if (otp !== undefined && !/^\d{6}$/.test(String(otp || ""))) {
    errors.otp = "OTP must be exactly 6 digits.";
  }

  return errors;
};
