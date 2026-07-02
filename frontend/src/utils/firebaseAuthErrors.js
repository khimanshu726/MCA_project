const errorMessages = {
  "auth/account-exists-with-different-credential":
    "An account already exists with a different sign-in method. Use the original provider to continue.",
  "auth/cancelled-popup-request": "Another sign-in popup is already open. Complete or close it first.",
  "auth/invalid-app-credential":
    "Phone verification could not be initialized. Refresh the page and try again.",
  "auth/invalid-phone-number": "Enter a valid mobile number with the correct format.",
  "auth/invalid-verification-code": "The OTP you entered is invalid. Check the code and try again.",
  "auth/missing-phone-number": "Enter your mobile number before requesting an OTP.",
  "auth/missing-verification-code": "Enter the OTP sent to your phone.",
  "auth/network-request-failed": "Network request failed. Check your connection and try again.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and try again.",
  "auth/popup-closed-by-user": "The sign-in popup was closed before authentication finished.",
  "auth/quota-exceeded": "Firebase phone authentication quota is exhausted. Please try again later.",
  "auth/requires-recent-login": "For security, sign in again before continuing.",
  "auth/too-many-requests": "Too many attempts were made. Wait a bit before trying again.",
  "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication settings.",
  "auth/user-disabled": "This account has been disabled. Contact support if you need help.",
  "auth/web-storage-unsupported":
    "This browser cannot persist Firebase sessions. Enable storage or use a modern browser.",
};

export const getFirebaseAuthErrorMessage = (error) => {
  if (!error) {
    return "Authentication failed. Please try again.";
  }

  return errorMessages[error.code] || error.message || "Authentication failed. Please try again.";
};
