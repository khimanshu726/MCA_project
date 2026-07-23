/**
 * Blocks a sensitive action when the caller is an email/password account that
 * has not verified its address. The server half of the verification gate whose
 * client half is EmailVerificationGate — a client-only gate is a suggestion,
 * not a control, since anyone can call the API directly.
 *
 * Scope, deliberately narrow:
 *   - No `firebaseClaims` (a guest, on the optionally-authenticated order
 *     route) passes here. Guest checkout is retired at the UI, not by turning
 *     this into an auth requirement — that belongs to the route's own auth
 *     middleware, and forcing it here would reject the guest-order path the
 *     order tests still exercise.
 *   - A non-password provider (Google, Facebook, phone-OTP) passes: Google and
 *     Facebook hand us an already-verified email, and phone accounts have no
 *     email to verify. Gating them would demand proof of something already
 *     proven, or absent.
 *
 * Only the exact case that needs it — password provider, address not verified —
 * is stopped.
 */
export const requireVerifiedEmail = (req, res, next) => {
  const claims = req.firebaseClaims;

  if (!claims || claims.signInProvider !== "password") {
    return next();
  }

  if (claims.emailVerified) {
    return next();
  }

  return res.status(403).json({
    code: "EMAIL_NOT_VERIFIED",
    message:
      "Verify your email address before placing an order. Check your inbox for the verification link we sent.",
  });
};
