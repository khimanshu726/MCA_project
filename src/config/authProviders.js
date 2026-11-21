// Which social sign-in buttons the storefront offers.
//
// A provider must be enabled in the Firebase console (Authentication → Sign-in
// method) before its button can work; a button for a disabled provider fails on
// every click with `auth/operation-not-allowed`. Google is enabled on this
// project. Facebook is not, so its button is off unless explicitly turned on
// here — enable it in Firebase first, then set VITE_ENABLE_FACEBOOK_LOGIN=true.
export const FACEBOOK_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_FACEBOOK_LOGIN === "true";
