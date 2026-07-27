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
  findAdminByEmail,
  findUserByEmail,
  findUserById,
  findUserByMobile,
  hasDuplicateUser,
} from "../services/userStore.js";
import {
  buildEmailVerificationLink,
  buildPasswordResetLink,
  revokeFirebaseSessions,
} from "../config/firebaseAdmin.js";
import {
  isResendConfigured,
  sendLoginOtpEmail,
  sendPasswordResetLinkEmail,
  sendVerificationLinkEmail,
} from "../services/email/resendService.js";
import {
  saveOtpForEmail,
  saveOtpForMobile,
  verifyOtpForEmail,
  verifyOtpForMobile,
} from "../services/otpStore.js";
import { sendOtpSms } from "../services/smsService.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same generic answer whether or not the address is registered — the whole
// point of not leaking which emails have accounts (see requestPasswordReset).
const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, a password reset link is on its way. Check your spam folder too.";

// Same reply whether or not the email belongs to an admin — the send only
// happens for a real admin, so an unknown email learns nothing.
const GENERIC_ADMIN_OTP_MESSAGE =
  "If an admin account exists for that email, a sign-in code has been sent. Check your spam folder too.";

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

  // Admin-scoped lookup: a passwordless customer record sharing this email (the
  // same person signed in as a Firebase customer) must never shadow the admin
  // account and turn a correct password into "Invalid credentials".
  const user = await findAdminByEmail(identifier);

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

    const user = await findUserByMobile(mobile);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "No admin account is provisioned for this mobile number." });
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

/**
 * Admin email OTP — request a one-time code. Enumeration-safe: a code is
 * generated and mailed only for a real admin, and every request returns the
 * same generic reply, so an unknown email is indistinguishable from an admin's.
 * `devOtp` is returned only outside production, to make local testing possible.
 */
export const sendAdminEmailOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email || "");

  if (!email || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  const admin = await findAdminByEmail(email);
  if (!admin) {
    return res.json({ message: GENERIC_ADMIN_OTP_MESSAGE });
  }

  const code = String(crypto.randomInt(100000, 999999));
  const otpResult = await saveOtpForEmail(email, code);

  if (!otpResult.ok) {
    return res.status(429).json({ message: otpResult.message });
  }

  await sendLoginOtpEmail(email, code);

  // In production the reply is exactly the generic message — byte-identical to
  // the unknown-email branch above, so it reveals nothing. The code + expiry are
  // added only outside production, to make local testing possible.
  const payload = { message: GENERIC_ADMIN_OTP_MESSAGE };
  if (process.env.NODE_ENV !== "production") {
    payload.devOtp = code;
    payload.expiresAt = otpResult.expiresAt;
  }
  return res.json(payload);
};

/**
 * Admin email OTP — verify a code and issue an admin session. The code must be
 * valid AND the email must still resolve to an admin account.
 */
export const verifyAdminEmailOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email || "");
  const otp = String(req.body.otp || "").trim();

  if (!email || !EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "Enter your email and the 6-digit code." });
  }

  const otpIsValid = await verifyOtpForEmail(email, otp);
  if (!otpIsValid) {
    return res.status(401).json({ message: "Invalid or expired code." });
  }

  const admin = await findAdminByEmail(email);
  if (!admin) {
    return res.status(401).json({ message: "Invalid or expired code." });
  }

  const token = issueAuthToken(admin);

  return res.json({
    token,
    user: mapUserForClient(admin),
  });
};

export const getCurrentAuthUser = async (req, res) => {
  const userId = req.admin?.id || req.auth?.id;
  const user = req.userRecord || (userId ? await findUserById(userId) : null);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    user: mapUserForClient(user),
  });
};

export const getCurrentCustomerUser = async (req, res) => {
  const userId = req.customer?.id || req.auth?.id;
  const user = req.userRecord || (userId ? await findUserById(userId) : null);

  if (!user || user.role !== "customer") {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    user: mapUserForClient(user),
  });
};

/**
 * Ends the customer's session on the server, for every device.
 *
 * Signing out of Firebase in the browser only discards the local credential —
 * an ID token already minted stays valid until it expires, and any other
 * device keeps its own. Revoking here, together with the checkRevoked in
 * verifyFirebaseIdToken, is what makes logout an actual invalidation rather
 * than a client-side state reset.
 *
 * Deliberately forgiving: if revocation fails (Firebase unreachable), the
 * client must still complete its own sign-out. A logout that refuses to
 * proceed because the network blinked would strand the user signed in on a
 * shared computer, which is the exact situation logout exists for.
 */
export const logoutCustomer = async (req, res) => {
  const firebaseUid = req.userRecord?.firebaseUid || req.customer?.firebaseUid;

  if (!firebaseUid) {
    return res.json({ message: "Signed out.", revoked: false });
  }

  try {
    await revokeFirebaseSessions(firebaseUid);
    return res.json({ message: "Signed out.", revoked: true });
  } catch (error) {
    console.error("Failed to revoke sessions on logout:", error);
    return res.json({ message: "Signed out locally.", revoked: false });
  }
};

/**
 * Public password-reset request (Option B). Generates a Firebase reset link via
 * the Admin SDK and sends it as branded HTML through Resend.
 *
 * ENUMERATION SAFETY is the load-bearing property here. The response is byte-
 * identical whether or not the address exists:
 *   - unknown email  -> generatePasswordResetLink throws auth/user-not-found,
 *                        which we swallow, then return the generic message.
 *   - known email    -> link generated, email sent, same generic message.
 * The only branch that differs is a GLOBAL condition (provider flag off, Admin
 * unconfigured, or Resend disabled) that is independent of any specific email,
 * so it can't be used as an oracle. In those cases we return provider:"firebase"
 * and the client falls back to the Firebase-sent email — a config-only rollback.
 */
export const requestPasswordReset = async (req, res) => {
  const email = normalizeEmail(req.body.email || req.body.identifier || "");

  if (!email || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  // Global fallback conditions — same for every email, so no information leaks.
  if (appConfig.emailSecurityProvider !== "resend" || !isResendConfigured()) {
    return res.json({ provider: "firebase", message: GENERIC_RESET_MESSAGE });
  }

  try {
    const link = await buildPasswordResetLink(email);
    // Fire the send; sendEmail never throws and a delivery failure must not
    // change the response (that would be an oracle during a Resend blip).
    await sendPasswordResetLinkEmail(email, link);
  } catch (error) {
    // Admin SDK unconfigured is a server fault, not the customer's — let the
    // client use Firebase so recovery still works. This is global, not per-email.
    if (error?.statusCode === 503) {
      return res.json({ provider: "firebase", message: GENERIC_RESET_MESSAGE });
    }
    // auth/user-not-found (and anything else) is swallowed: the generic reply
    // below is returned so an unknown address is indistinguishable from a known
    // one. Real errors are logged without the address for triage.
    if (error?.code && error.code !== "auth/user-not-found" && error.code !== "auth/email-not-found") {
      console.error("[auth] password reset link generation failed:", error?.code || error?.message);
    }
  }

  return res.json({ provider: "resend", message: GENERIC_RESET_MESSAGE });
};

/**
 * Authenticated email-verification (re)send (Option B). The customer is signed
 * in, so this is their own address — enumeration isn't a concern, and we can
 * fall back to Firebase on any error to maximise the chance the mail goes out.
 */
export const requestEmailVerification = async (req, res) => {
  const email = req.customer?.email;
  const provider = req.firebaseClaims?.signInProvider;
  const alreadyVerified = req.firebaseClaims?.emailVerified;

  if (!email) {
    return res.status(400).json({ message: "This account has no email address to verify." });
  }
  if (provider !== "password") {
    return res.status(400).json({ message: "This account doesn't use email/password sign-in." });
  }
  if (alreadyVerified) {
    return res.json({ provider: "resend", alreadyVerified: true, message: "Your email is already verified." });
  }

  if (appConfig.emailSecurityProvider !== "resend" || !isResendConfigured()) {
    return res.json({ provider: "firebase", message: "Verification email requested." });
  }

  try {
    const link = await buildEmailVerificationLink(email);
    await sendVerificationLinkEmail(email, link);
  } catch (error) {
    console.error("[auth] verification link generation failed:", error?.code || error?.message);
    return res.json({ provider: "firebase", message: "Verification email requested." });
  }

  return res.json({ provider: "resend", message: "Verification email sent. Check your inbox." });
};

export const handleGoogleCallback = async (req, res) => {
  if (!req.user) {
    return res.redirect(`${appConfig.authFailureRedirect}?error=google_auth_failed`);
  }

  const token = issueAuthToken(req.user);
  return res.redirect(`${appConfig.authSuccessRedirect}?token=${encodeURIComponent(token)}`);
};
