import { devError } from "./logger";

/**
 * What the customer is shown, and what they can do about it, after an
 * email/password sign-in fails.
 *
 * Every branch returns copy that is safe to display and, where useful, the
 * recovery actions to offer beside it — `showReset` for a "reset password"
 * link, `showRegister` for a "create account" link.
 *
 * Two rules hold across every case, both from the security section of the
 * brief:
 *
 *  - The raw Firebase code never appears in the returned message. Codes are
 *    an internal detail; a customer can do nothing with "auth/invalid-
 *    credential" except distrust the page. They are logged for us instead.
 *
 *  - "No such account" and "wrong password" are answered with ONE message and
 *    BOTH recovery links, never told apart. Firebase's email-enumeration
 *    protection returns auth/invalid-credential for both and offers no way to
 *    distinguish them client-side — which is the point: distinguishing them is
 *    exactly the user-enumeration leak the brief says to prevent. So rather
 *    than guess and risk being wrong (or being an oracle), the form offers the
 *    right next step for either situation and lets the customer pick.
 */
export function mapLoginError(error) {
  const code = typeof error?.code === "string" ? error.code : "";

  // Logged, not shown. This is where a genuinely diagnosable failure — a
  // disabled provider, an unauthorized domain — stays visible to us.
  devError("[Auth] Email/password sign-in failed", code || error);

  switch (code) {
    case "auth/too-many-requests":
      return {
        message:
          "Too many unsuccessful login attempts. Please wait a few minutes before trying again, or reset your password.",
        showReset: true,
        showRegister: false,
      };

    case "auth/network-request-failed":
      return {
        message: "Unable to connect. Check your internet connection and try again.",
        showReset: false,
        showRegister: false,
      };

    case "auth/user-disabled":
      return {
        message: "This account has been disabled. Contact support if you need help.",
        showReset: false,
        showRegister: false,
      };

    case "auth/invalid-email":
      return { message: "Enter a valid email address.", showReset: false, showRegister: false };

    // The three that mean "these credentials didn't work", collapsed on
    // purpose. invalid-credential is what modern Firebase returns; the other
    // two are what older projects (enumeration protection off) return, handled
    // identically so the experience is the same either way.
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return {
        message: "Email or password is incorrect.",
        showReset: true,
        showRegister: true,
      };

    default:
      return {
        message: "Something went wrong. Please try again.",
        showReset: false,
        showRegister: false,
      };
  }
}
