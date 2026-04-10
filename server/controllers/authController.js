import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { appConfig } from "../config.js";
import {
  detectLoginType,
  issueAuthToken,
  mapUserForClient,
  normalizeEmail,
  normalizeMobile,
  validateCustomerRegistrationPayload,
  validateEmailRegistrationPayload,
  validateLoginPayload,
  validateOtpPayload,
} from "../utils/authHelpers.js";
import {
  createUserRecord,
  findUserByEmail,
  findUserById,
  findUserByMobile,
  hasDuplicateUser,
} from "../services/userStore.js";
import { saveOtpForMobile, verifyOtpForMobile } from "../services/otpStore.js";
import { sendOtpSms } from "../services/smsService.js";

const hasValidationErrors = (errors) => Object.values(errors).some(Boolean);

const resolveUserByLoginType = async (identifier, loginType) => {
  if (loginType === "email") {
    return findUserByEmail(identifier);
  }

  if (loginType === "mobile") {
    return findUserByMobile(identifier);
  }

  return null;
};

export const registerUser = async (req, res) => {
  const { identifier = "", password = "" } = req.body;
  const errors = validateEmailRegistrationPayload({ identifier, password });

  if (hasValidationErrors(errors)) {
    return res.status(400).json({ message: "Please correct the registration fields.", errors });
  }

  const email = normalizeEmail(identifier);

  if (await hasDuplicateUser({ email })) {
    return res.status(409).json({
      message: "An account already exists with that email address.",
    });
  }

  const passwordHash = await bcrypt.hash(password.trim(), 10);
  const user = await createUserRecord({
    email,
    mobile: "",
    password: passwordHash,
    provider: "email",
    role: "admin",
  });

  const token = issueAuthToken(user);

  return res.status(201).json({
    token,
    user: mapUserForClient(user),
  });
};

export const loginUser = async (req, res) => {
  const { identifier = "", password = "" } = req.body;
  const { errors, loginType } = validateLoginPayload({ identifier, password });

  if (hasValidationErrors(errors)) {
    return res.status(400).json({ message: "Please correct the login fields.", errors, loginType });
  }

  if (loginType === "mobile") {
    return res.status(400).json({
      message: "Mobile login uses OTP. Request an OTP instead of password login.",
      loginType,
    });
  }

  const user = await findUserByEmail(identifier);

  if (!user || !user.password) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const passwordMatches = await bcrypt.compare(password.trim(), user.password);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = issueAuthToken(user);

  return res.json({
    token,
    user: mapUserForClient(user),
  });
};

export const registerCustomer = async (req, res) => {
  const { identifier = "", password = "" } = req.body;
  const { errors, loginType } = validateCustomerRegistrationPayload({ identifier, password });

  if (hasValidationErrors(errors)) {
    return res.status(400).json({ message: "Please correct the registration fields.", errors });
  }

  const email = loginType === "email" ? normalizeEmail(identifier) : "";
  const mobile = loginType === "mobile" ? normalizeMobile(identifier) : "";

  if (await hasDuplicateUser({ email, mobile })) {
    return res.status(409).json({
      message: `An account already exists with that ${loginType === "email" ? "email address" : "mobile number"}.`,
    });
  }

  const passwordHash = await bcrypt.hash(password.trim(), 10);
  const user = await createUserRecord({
    email,
    mobile,
    password: passwordHash,
    provider: loginType,
    role: "customer",
  });

  const token = issueAuthToken(user);

  return res.status(201).json({
    token,
    user: mapUserForClient(user),
  });
};

export const loginCustomer = async (req, res) => {
  const { identifier = "", password = "" } = req.body;
  const { errors, loginType } = validateLoginPayload({ identifier, password });

  if ((loginType === "email" || loginType === "mobile") && !password?.trim()) {
    errors.password = "Password is required for login.";
  }

  if (hasValidationErrors(errors)) {
    return res.status(400).json({ message: "Please correct the login fields.", errors, loginType });
  }

  if (loginType === "unknown") {
    return res.status(400).json({ message: "Use a valid email address or 10-digit mobile number." });
  }

  const user = await resolveUserByLoginType(identifier, loginType);

  if (!user || user.role !== "customer" || !user.password) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const passwordMatches = await bcrypt.compare(password.trim(), user.password);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = issueAuthToken(user);

  return res.json({
    token,
    user: mapUserForClient(user),
  });
};

export const sendOtp = async (req, res) => {
  console.log("[AUTH] OTP request received", { mobile: req.body.mobile });
  const errors = validateOtpPayload({ mobile: req.body.mobile });

  if (hasValidationErrors(errors)) {
    return res.status(400).json({ message: "Enter a valid mobile number.", errors });
  }

  try {
    const mobile = normalizeMobile(req.body.mobile);
    const otp = String(crypto.randomInt(100000, 999999));
    console.log("[AUTH] Generated OTP", { mobile, otp });
    const otpResult = await saveOtpForMobile(mobile, otp);

    if (!otpResult.ok) {
      return res.status(429).json({ message: otpResult.message });
    }

    const smsResult = await sendOtpSms(mobile, otp);

    return res.json({
      message: "OTP sent successfully.",
      expiresAt: otpResult.expiresAt,
      devOtp: smsResult.devOtp,
    });
  } catch (error) {
    console.error("[AUTH] Error sending OTP", error);
    return res.status(500).json({ message: "Error sending OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  console.log("[AUTH] OTP verification request received", {
    mobile: req.body.mobile,
    otpLength: String(req.body.otp || "").length,
  });
  const errors = validateOtpPayload({ mobile: req.body.mobile, otp: req.body.otp });

  if (hasValidationErrors(errors)) {
    return res.status(400).json({ message: "Enter a valid mobile number and OTP.", errors });
  }

  try {
    const mobile = normalizeMobile(req.body.mobile);
    const otpIsValid = await verifyOtpForMobile(mobile, req.body.otp);

    if (!otpIsValid) {
      return res.status(401).json({ message: "Invalid or expired OTP." });
    }

    let user = await findUserByMobile(mobile);

    if (!user) {
      user = await createUserRecord({
        email: "",
        mobile,
        password: "",
        provider: "mobile",
        role: "admin",
      });
    }

    const token = issueAuthToken(user);

    return res.json({
      token,
      user: mapUserForClient(user),
    });
  } catch (error) {
    console.error("[AUTH] Error verifying OTP", error);
    return res.status(500).json({ message: "Error verifying OTP" });
  }
};

export const getCurrentAuthUser = async (req, res) => {
  const user = req.userRecord || (await findUserById(req.admin.id));

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    user: mapUserForClient(user),
  });
};

export const getCurrentCustomerUser = async (req, res) => {
  const user = req.userRecord || (await findUserById(req.customer.id));

  if (!user || user.role !== "customer") {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    user: mapUserForClient(user),
  });
};

export const handleGoogleCallback = async (req, res) => {
  if (!req.user) {
    return res.redirect(`${appConfig.authFailureRedirect}?error=google_auth_failed`);
  }

  const token = issueAuthToken(req.user);
  return res.redirect(`${appConfig.authSuccessRedirect}?token=${encodeURIComponent(token)}`);
};
