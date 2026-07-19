const errorMessages = {
  "auth/account-exists-with-different-credential":
    "An account already exists with a different sign-in method. Use the original provider to continue.",
  "auth/admin-restricted-operation": "This sign-in method is not available right now. Please contact support.",
  "auth/cancelled-popup-request": "Another sign-in popup is already open. Complete or close it first.",
  "auth/email-already-in-use": "An account with this email already exists. Please sign in instead.",
  "auth/expired-action-code": "This action link has expired. Request a new one and try again.",
  "auth/internal-error": "We could not complete authentication right now. Please try again in a moment.",
  "auth/invalid-action-code": "This action link is invalid. Request a fresh one and try again.",
  "auth/invalid-app-credential":
    "Phone verification could not be initialized. Refresh the page and try again.",
  "auth/invalid-credential": "The login details you entered are not correct. Please try again.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/invalid-phone-number": "Enter a valid mobile number with the correct format.",
  "auth/missing-password": "Enter your password to continue.",
  "auth/invalid-verification-code": "The OTP you entered is invalid. Check the code and try again.",
  "auth/missing-phone-number": "Enter your mobile number before requesting an OTP.",
  "auth/missing-verification-code": "Enter the OTP sent to your phone.",
  "auth/operation-not-allowed":
    "Email/password sign-up is disabled in Firebase. Enable the Email/Password provider in Firebase Authentication, then try again.",
  "auth/network-request-failed": "Network request failed. Check your connection and try again.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and try again.",
  "auth/popup-closed-by-user": "The sign-in popup was closed before authentication finished.",
  "auth/quota-exceeded": "Firebase phone authentication quota is exhausted. Please try again later.",
  "auth/requires-recent-login": "For security, sign in again before continuing.",
  "auth/too-many-requests": "Too many attempts were made. Wait a bit before trying again.",
  "auth/user-not-found": "No account was found with those details. Please register first.",
  "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication settings.",
  "auth/user-disabled": "This account has been disabled. Contact support if you need help.",
  "auth/weak-password":
    "Use a stronger password with at least 8 characters, uppercase, lowercase, a number, and a special character.",
  "auth/web-storage-unsupported":
    "This browser cannot persist Firebase sessions. Enable storage or use a modern browser.",
  "auth/wrong-password": "The email or password you entered is incorrect.",
  // Raised by our own service layer rather than Firebase, for the cases that
  // used to return quietly and be reported to the customer as success.
  "auth/no-current-user": "You need to be signed in to request a verification email.",
  "auth/missing-email": "This account has no email address to verify.",
  "auth/already-verified": "This email is already verified — you're all set.",
};

export const getFirebaseAuthErrorMessage = (error) => {
  if (!error) {
    return "Authentication failed. Please try again.";
  }

  const known = errorMessages[error.code];
  if (known) {
    return known;
  }

  // Everything unmapped used to collapse into a single generic sentence, which
  // is how a specific, diagnosable failure — an unauthorized domain, a
  // disabled provider, an exhausted quota — became "authentication failed" and
  // looked like nothing happening at all. Carrying the raw code through costs
  // the customer nothing (they can read it to support) and is the difference
  // between a fixable report and a shrug.
  const code = typeof error.code === "string" ? error.code : "";
  return code
    ? `Authentication failed (${code}). Please try again, or contact support with that code.`
    : "Authentication failed. Please try again.";
};
