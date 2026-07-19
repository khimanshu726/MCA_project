import { fetchSignInMethodsForEmail, sendPasswordResetEmail } from "firebase/auth";
import { ensureFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";

/**
 * Answers the one question the UI cannot: when a verification or reset email
 * never arrives, is that our code, or Firebase project configuration?
 *
 * Client code can only prove it *asked* Firebase to send. Delivery depends on
 * things that live in the Firebase Console and the recipient's mail provider —
 * neither of which is observable from here. So rather than guess, this reports
 * exactly what Firebase said, and leaves the conclusion to a human.
 *
 * Intended to be run once from the browser console:
 *
 *   const { runAuthEmailDiagnostic } = await import("/src/utils/authDiagnostics.js");
 *   await runAuthEmailDiagnostic("someone@example.com");
 *
 * Nothing here is wired into the UI, and it sends a real reset email to the
 * address given — use an inbox you control.
 */
export const runAuthEmailDiagnostic = async (email) => {
  const report = {
    checkedAt: new Date().toISOString(),
    email,
    firebaseConfigured: isFirebaseConfigured,
    authDomain: null,
    projectId: null,
    usingEmulator: Boolean(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST),
    accountExists: null,
    signInMethods: null,
    passwordResetAccepted: null,
    firebaseErrorCode: null,
    firebaseErrorMessage: null,
    interpretation: "",
  };

  if (!isFirebaseConfigured) {
    report.interpretation =
      "Firebase is not configured in this build — the VITE_FIREBASE_* variables are missing. No email could ever be sent.";
    return report;
  }

  const auth = ensureFirebaseAuth();
  report.authDomain = auth.config?.authDomain ?? null;
  report.projectId = auth.app?.options?.projectId ?? null;

  if (report.usingEmulator) {
    report.interpretation =
      "This build points at the Firebase Auth EMULATOR. The emulator never sends real email — it logs the link to its own console. Real inboxes will always appear empty. Unset VITE_FIREBASE_AUTH_EMULATOR_HOST to test real delivery.";
    return report;
  }

  // Whether an account exists at all is the single most common explanation for
  // "the reset email never arrived": Firebase's email-enumeration protection
  // makes sendPasswordResetEmail resolve successfully for addresses that have
  // no account, so the UI reports success and nothing is ever sent.
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    report.signInMethods = methods;
    report.accountExists = methods.length > 0;
  } catch (error) {
    // Newer projects disable enumeration entirely, which is a good default and
    // makes this check unavailable rather than failed.
    report.signInMethods = `unavailable (${error?.code || "unknown"})`;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    report.passwordResetAccepted = true;
  } catch (error) {
    report.passwordResetAccepted = false;
    report.firebaseErrorCode = error?.code ?? null;
    report.firebaseErrorMessage = error?.message ?? null;
  }

  if (report.passwordResetAccepted && report.accountExists === false) {
    report.interpretation =
      "Firebase accepted the request, but no account exists for this address — so no email is sent. This is expected behaviour, not a bug. Test with an address that has actually registered.";
  } else if (report.passwordResetAccepted) {
    report.interpretation =
      "Firebase ACCEPTED the send request, so the client code is working. If no email arrives, the cause is downstream: check Firebase Console → Authentication → Templates (is the template enabled, and is the sender domain verified?), Authentication → Settings → Authorized domains (must include the domain you are testing from), the recipient's spam folder, and the project's daily email quota.";
  } else if (report.firebaseErrorCode === "auth/unauthorized-continue-uri") {
    report.interpretation =
      "The continue/redirect URL is not on the authorized-domains list. Add it in Firebase Console → Authentication → Settings → Authorized domains.";
  } else {
    report.interpretation = `Firebase REJECTED the send request with ${report.firebaseErrorCode}. This is a configuration or input problem, and the message above says which.`;
  }

  return report;
};
