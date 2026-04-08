import { Router } from "express";
import rateLimit from "express-rate-limit";
import { appConfig } from "../config.js";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";
import passport, { configurePassport, isGoogleAuthConfigured } from "../auth/passport.js";
import {
  getCurrentAuthUser,
  handleGoogleCallback,
  loginUser,
  registerUser,
  sendOtp,
  verifyOtp,
} from "../controllers/authController.js";

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many OTP requests. Please wait before trying again.",
  },
});

const redirectWhenGoogleUnavailable = (_req, res) =>
  res.redirect(`${appConfig.authFailureRedirect}?error=google_not_configured`);

const logGoogleRoute = (req, _res, next) => {
  console.log(`[AUTH] Google route hit: ${req.originalUrl}`);
  next();
};

configurePassport();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/me", authenticateAdmin, getCurrentAuthUser);

router.get(
  "/google",
  logGoogleRoute,
  isGoogleAuthConfigured()
    ? passport.authenticate("google", { scope: ["profile", "email"], session: false })
    : redirectWhenGoogleUnavailable,
);

router.get(
  "/google/callback",
  logGoogleRoute,
  isGoogleAuthConfigured()
    ? passport.authenticate("google", {
        session: false,
        failureRedirect: `${appConfig.authFailureRedirect}?error=google_auth_failed`,
      })
    : redirectWhenGoogleUnavailable,
  handleGoogleCallback,
);

export default router;
