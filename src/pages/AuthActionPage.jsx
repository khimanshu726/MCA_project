import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthSplitShell from "../components/AuthSplitShell";
import PasswordField from "../components/PasswordField";
import PasswordChecklist from "../components/PasswordChecklist";
import {
  applyEmailVerificationCode,
  confirmPasswordResetWithCode,
  verifyResetCode,
} from "../services/customerAuthService";
import { getConfirmPasswordError, getPasswordChecks, isStrongPassword } from "../utils/authValidation";
import { getFirebaseAuthErrorMessage } from "../utils/firebaseAuthErrors";

const PHASE = {
  WORKING: "working",
  RESET_FORM: "reset-form",
  SUCCESS: "success",
  ERROR: "error",
};

/**
 * The branded destination for Firebase's verification and password-reset
 * links.
 *
 * Configuring a custom action URL in the Firebase console points those emails
 * here instead of at Google's default screen, so a customer clicking "verify"
 * or "reset password" stays inside the Elite Impressions experience — and an
 * expired or already-used link is explained in our own words, with a way
 * forward, rather than a bare error page.
 *
 * Firebase appends `mode` (verifyEmail | resetPassword | recoverEmail) and a
 * single-use `oobCode`. We redeem the code with the SDK; Firebase remains the
 * authority on token validity, single-use, and expiry.
 */
function AuthActionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get("mode") || "";
  const oobCode = searchParams.get("oobCode") || "";

  const [phase, setPhase] = useState(PHASE.WORKING);
  const [errorMessage, setErrorMessage] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  // Reset-password form state.
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const confirmError = touched.confirmPassword ? getConfirmPasswordError(password, confirmPassword) : "";
  const canSubmit = isStrongPassword(password) && password === confirmPassword && !isSubmitting;

  // Redeem the code once on arrival. A ref guards against React 18 StrictMode's
  // double-invoke consuming a single-use code twice (the second attempt would
  // fail as "already used" and wrongly show an error).
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const run = async () => {
      if (!oobCode) {
        setErrorMessage("This link is missing its security code. Request a fresh email and try again.");
        setPhase(PHASE.ERROR);
        return;
      }

      try {
        if (mode === "verifyEmail" || mode === "recoverEmail") {
          await applyEmailVerificationCode(oobCode);
          setPhase(PHASE.SUCCESS);
          return;
        }

        if (mode === "resetPassword") {
          const email = await verifyResetCode(oobCode);
          setResetEmail(email || "");
          setPhase(PHASE.RESET_FORM);
          return;
        }

        setErrorMessage("This link isn't one we recognise. Request a fresh email and try again.");
        setPhase(PHASE.ERROR);
      } catch (error) {
        setErrorMessage(getFirebaseAuthErrorMessage(error));
        setPhase(PHASE.ERROR);
      }
    };

    run();
  }, [mode, oobCode]);

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setTouched({ password: true, confirmPassword: true });

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordResetWithCode(oobCode, password);
      setPhase(PHASE.SUCCESS);
    } catch (error) {
      setErrorMessage(getFirebaseAuthErrorMessage(error));
      setPhase(PHASE.ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const successCopy =
    mode === "resetPassword"
      ? {
          title: "Password updated",
          body: "Your password has been changed. Sign in with your new password to continue.",
        }
      : {
          title: "Email verified",
          body: "Thanks — your email address is confirmed. You can now check out and manage your account.",
        };

  const shellProps =
    mode === "resetPassword"
      ? {
          eyebrow: "Reset password",
          title: "Choose a new password",
          subtitle: "Pick a strong password you don't use anywhere else.",
        }
      : {
          eyebrow: "Account security",
          title: "Confirming your request",
          subtitle: "One moment while we verify your secure link.",
        };

  const promptProps = {
    promptText: "Remembered your details?",
    promptLinkTo: "/login",
    promptLinkLabel: "Sign in",
  };

  return (
    <AuthSplitShell
      {...shellProps}
      {...promptProps}
      leftHeadline="Your account, kept secure."
      leftCaption="Verification and password links are single-use and expire quickly — the safe way to prove it's really you."
      highlights={[
        "Links are single-use and time-limited.",
        "We never ask for your password over email.",
        "Signed in across devices until you sign out.",
      ]}
    >
      <div className="auth-card-stack">
        {phase === PHASE.WORKING ? (
          <div className="auth-action-status" aria-live="polite">
            <span className="auth-spinner" aria-hidden="true" />
            <p>Verifying your link…</p>
          </div>
        ) : null}

        {phase === PHASE.RESET_FORM ? (
          <form className="auth-modern-form" onSubmit={handleResetSubmit} noValidate>
            {resetEmail ? (
              <p className="auth-inline-helper">
                Resetting the password for <strong>{resetEmail}</strong>.
              </p>
            ) : null}

            <PasswordField
              id="reset-password"
              label="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              autoComplete="new-password"
              placeholder="Create a strong password"
              autoFocus
            />
            <PasswordChecklist checks={passwordChecks} />

            <PasswordField
              id="reset-confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
              error={confirmError}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
            />

            <button type="submit" className="auth-submit-button" disabled={!canSubmit}>
              {isSubmitting ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : null}

        {phase === PHASE.SUCCESS ? (
          <div className="auth-action-status" aria-live="polite">
            <h2 className="auth-action-title">{successCopy.title}</h2>
            <p>{successCopy.body}</p>
            <button
              type="button"
              className="auth-submit-button"
              onClick={() => navigate("/login", { replace: true })}
            >
              Continue to sign in
            </button>
          </div>
        ) : null}

        {phase === PHASE.ERROR ? (
          <div className="auth-action-status" aria-live="polite">
            <h2 className="auth-action-title">This link didn't work</h2>
            <p className="field-error auth-error">{errorMessage}</p>
            <p className="auth-modal-switch">
              Links expire for your security.{" "}
              <Link className="auth-text-button" to="/login">
                Back to sign in
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </AuthSplitShell>
  );
}

export default AuthActionPage;
