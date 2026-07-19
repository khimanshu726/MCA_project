import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import AuthProviderButtons from "./AuthProviderButtons";
import AuthToast from "./AuthToast";
import InputField from "./InputField";
import PasswordField from "./PasswordField";
import PhoneOtpForm from "./PhoneOtpForm";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../hooks/useToast";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  sendCustomerPasswordReset,
  signInCustomerWithEmail,
  signInCustomerWithFacebook,
  signInCustomerWithGoogle,
} from "../services/customerAuthService";
import { sessionEndedMessage } from "../auth/sessionPolicy";
import { buildLoginErrors, hasErrors, normalizeEmailInput } from "../utils/authValidation";
import { getFirebaseAuthErrorMessage } from "../utils/firebaseAuthErrors";

const RESET_COOLDOWN_SECONDS = 60;

function CustomerLoginCard({ destination = "/account" }) {
  const navigate = useNavigate();
  const {
    isLoading,
    refreshProfile,
    signInWithPhoneOtp,
    prepareSignIn,
    completeSignIn,
    sessionEndedReason,
    clearSessionEndedReason,
  } = useUserAuth();
  // Defaults to off. "Keep me signed in" is a choice the customer makes, not
  // one we make for them — and on a shared machine the safe default is the
  // shorter session.
  const [rememberMe, setRememberMe] = useState(false);
  // Stops repeat taps firing a burst of resets — which trips Firebase's
  // auth/too-many-requests and locks the customer out of the one recovery
  // path they were trying to use.
  const [resetCooldownSeconds, setResetCooldownSeconds] = useState(0);

  useEffect(() => {
    if (resetCooldownSeconds <= 0) return undefined;
    const timerId = window.setTimeout(() => setResetCooldownSeconds((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timerId);
  }, [resetCooldownSeconds]);

  // The notice explains why they landed here; it should not outlive the visit.
  // Clearing on unmount stops it reappearing on a later, deliberate visit to
  // the login page, where it would be a confusing claim about a session that
  // ended long ago.
  useEffect(() => clearSessionEndedReason, [clearSessionEndedReason]);
  const { toast, pushToast, dismiss } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touchedFields, setTouchedFields] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isProviderBusy, setIsProviderBusy] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const validationErrors = useMemo(() => buildLoginErrors({ email, password }), [email, password]);
  const canSubmit =
    isFirebaseConfigured &&
    !isLoading &&
    !isEmailSubmitting &&
    !isProviderBusy &&
    !hasErrors(validationErrors);

  const handleProviderSignIn = async (providerType) => {
    if (!isFirebaseConfigured) {
      setSubmitError("Firebase authentication is not configured yet.");
      return;
    }

    setSubmitError("");
    setIsProviderBusy(true);

    try {
      // Persistence must be applied BEFORE the sign-in call — it governs how
      // the credential that sign-in is about to store gets persisted, so
      // setting it afterwards would leave this session on the previous mode.
      // This is the line that stops a Google sign-in lasting forever.
      await prepareSignIn(rememberMe);

      if (providerType === "facebook") {
        await signInCustomerWithFacebook();
      } else {
        await signInCustomerWithGoogle();
      }

      await refreshProfile();
      completeSignIn();
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsProviderBusy(false);
    }
  };

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setTouchedFields({ email: true, password: true });

    if (hasErrors(validationErrors)) {
      setSubmitError("Enter a valid email address and password to continue.");
      return;
    }

    setSubmitError("");
    setIsEmailSubmitting(true);

    try {
      await prepareSignIn(rememberMe);
      await signInCustomerWithEmail({
        email: normalizeEmailInput(email),
        password,
      });
      await refreshProfile();
      completeSignIn();
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setTouchedFields((currentValue) => ({ ...currentValue, email: true }));

    if (validationErrors.email) {
      setSubmitError(validationErrors.email);
      return;
    }

    if (resetCooldownSeconds > 0) {
      return;
    }

    setSubmitError("");
    setIsResettingPassword(true);

    try {
      await sendCustomerPasswordReset(normalizeEmailInput(email));
      // Deliberately hedged. Firebase's email-enumeration protection means
      // this call succeeds even when no account exists for the address, so a
      // flat "Check your inbox" is a promise we cannot keep — and someone
      // waiting on an email for an account they never created will conclude
      // the feature is broken. Naming both possibilities is the honest
      // version, and it costs nothing when the account does exist.
      pushToast({
        type: "success",
        title: "Reset link sent",
        message: `If an account exists for ${normalizeEmailInput(email)}, a reset link is on its way. Check spam too.`,
      });
      setResetCooldownSeconds(RESET_COOLDOWN_SECONDS);
    } catch (error) {
      const message = getFirebaseAuthErrorMessage(error);
      setSubmitError(message);
      // Failures were previously written inline only, below the fold on a
      // short viewport, while the success case got a toast. Same weight for
      // both, so a failure can't be missed.
      pushToast({ type: "error", title: "Couldn't send reset link", message });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendOtp = async (phoneNumber, verifier) => {
    // Applied before the OTP challenge, since confirming the code is what
    // stores the credential. All three providers land on the same policy.
    await prepareSignIn(rememberMe);
    return signInWithPhoneOtp(phoneNumber, verifier);
  };

  const handleVerifyOtp = async (confirmationResult, code) => {
    await confirmationResult.confirm(code);
    await refreshProfile();
    completeSignIn();
    navigate(destination, { replace: true });
  };

  return (
    <>
      <AuthToast toast={toast} onDismiss={dismiss} />

      <div className="auth-card-stack">
        {/* Explains why they are here, when they didn't choose to be. Landing
            on a login form with no explanation reads as the site losing your
            work; naming the cause makes it a normal, expected thing. */}
        {sessionEndedReason ? (
          <div
            role="status"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-gold-500/30 bg-bone-100 px-4 py-3 text-sm text-ink-700"
          >
            <Clock size={16} className="mt-0.5 shrink-0 text-gold-500" aria-hidden="true" />
            <span>{sessionEndedMessage(sessionEndedReason)}</span>
          </div>
        ) : null}

        <AuthProviderButtons
          isBusy={!isFirebaseConfigured || isLoading || isEmailSubmitting || isProviderBusy}
          onGoogle={() => handleProviderSignIn("google")}
          onFacebook={() => handleProviderSignIn("facebook")}
        />

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        <form className="auth-modern-form" onSubmit={handleEmailLogin} noValidate>
          <InputField
            label="Email Address"
            htmlFor="login-email"
            error={touchedFields.email ? validationErrors.email : ""}
          >
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSubmitError("");
              }}
              onBlur={() => setTouchedFields((currentValue) => ({ ...currentValue, email: true }))}
              autoFocus
            />
          </InputField>

          <PasswordField
            id="login-password"
            label="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setSubmitError("");
            }}
            onBlur={() => setTouchedFields((currentValue) => ({ ...currentValue, password: true }))}
            error={touchedFields.password ? validationErrors.password : ""}
            autoComplete="current-password"
            placeholder="Enter your password"
          />

          <div className="auth-form-meta">
            {/* Applies to every provider on this card, not just the password
                form — it is read at sign-in time by all three handlers. */}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="size-4 cursor-pointer accent-brand-500"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Keep me signed in
            </label>
            <button
              type="button"
              className="auth-text-button"
              onClick={handleForgotPassword}
              disabled={isResettingPassword || isEmailSubmitting || isProviderBusy || resetCooldownSeconds > 0}
            >
              {isResettingPassword
                ? "Sending reset link..."
                : resetCooldownSeconds > 0
                  ? `Resend in ${resetCooldownSeconds}s`
                  : "Forgot Password?"}
            </button>
          </div>

          {submitError ? <p className="field-error auth-error">{submitError}</p> : null}

          <button type="submit" className="auth-submit-button" disabled={!canSubmit}>
            {isEmailSubmitting ? "Signing in..." : "Login with Password"}
          </button>
        </form>

        <PhoneOtpForm
          mode="login"
          onSendOtp={handleSendOtp}
          onVerifyOtp={handleVerifyOtp}
          isBusy={isLoading || isEmailSubmitting || isProviderBusy}
          isConfigured={isFirebaseConfigured}
        />

        {!isFirebaseConfigured ? (
          <div className="auth-config-warning">
            <p className="field-error auth-error">
              Firebase authentication is not configured yet. Add the required environment variables to enable sign-in.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default CustomerLoginCard;
