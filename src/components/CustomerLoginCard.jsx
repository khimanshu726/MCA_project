import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import AuthProviderButtons from "./AuthProviderButtons";
import AuthToast from "./AuthToast";
import InputField from "./InputField";
import PasswordField from "./PasswordField";
import PhoneOtpForm from "./PhoneOtpForm";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../hooks/useToast";
import { mapFirebaseUserFallback } from "../hooks/useCustomerProfile";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  sendCustomerPasswordReset,
  signInCustomerWithEmail,
  signInCustomerWithFacebook,
  signInCustomerWithGoogle,
} from "../services/customerAuthService";
import { sessionEndedMessage } from "../auth/sessionPolicy";
import { buildLoginErrors, normalizeEmailInput } from "../utils/authValidation";
import { getFirebaseAuthErrorMessage } from "../utils/firebaseAuthErrors";
import { mapLoginError } from "../utils/loginErrors";

const focusById = (id) => {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.focus();
};

const RESET_COOLDOWN_SECONDS = 60;

function CustomerLoginCard({ destination = "/", onAuthenticated = null }) {
  const navigate = useNavigate();

  const finishAuth = (user) => {
    if (onAuthenticated) {
      onAuthenticated(user);
    } else {
      navigate(destination, { replace: true });
    }
  };

  const {
    isLoading,
    signInWithPhoneOtp,
    prepareSignIn,
    completeSignIn,
    primeAuthenticatedSession,
    sessionEndedReason,
    clearSessionEndedReason,
  } = useUserAuth();

  const [resetCooldownSeconds, setResetCooldownSeconds] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touchedFields, setTouchedFields] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isProviderBusy, setIsProviderBusy] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { toast, pushToast, dismiss } = useToast();

  useEffect(() => {
    if (resetCooldownSeconds <= 0) return undefined;
    const timerId = window.setTimeout(() => setResetCooldownSeconds((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timerId);
  }, [resetCooldownSeconds]);

  useEffect(() => clearSessionEndedReason, [clearSessionEndedReason]);

  const validationErrors = useMemo(() => buildLoginErrors({ email, password }), [email, password]);
  const canSubmit = isFirebaseConfigured && !isLoading && !isEmailSubmitting && !isProviderBusy;

  const clearErrors = () => {
    setSubmitError("");
    setLoginError(null);
  };

  const handleProviderSignIn = async (providerType) => {
    if (!isFirebaseConfigured) {
      setSubmitError("Firebase authentication is not configured yet.");
      return;
    }

    clearErrors();
    setIsProviderBusy(true);

    try {
      await prepareSignIn();
      const authUser =
        providerType === "facebook"
          ? await signInCustomerWithFacebook()
          : await signInCustomerWithGoogle();
      const readyUser = await primeAuthenticatedSession(authUser);
      completeSignIn();
      finishAuth(readyUser || mapFirebaseUserFallback(authUser));
    } catch (error) {
      setSubmitError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsProviderBusy(false);
    }
  };

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setTouchedFields({ email: true, password: true });
    clearErrors();

    if (validationErrors.email) {
      focusById("login-email");
      return;
    }

    if (validationErrors.password) {
      focusById("login-password");
      return;
    }

    setIsEmailSubmitting(true);

    try {
      await prepareSignIn();
      const authUser = await signInCustomerWithEmail({
        email: normalizeEmailInput(email),
        password,
      });
      const readyUser = await primeAuthenticatedSession(authUser);
      completeSignIn();

      if (authUser && !authUser.emailVerified) {
        pushToast({
          type: "info",
          title: "Verify your email",
          message: "Please verify your email before continuing. Check your inbox. You can resend it from your account.",
        });
      } else {
        pushToast({ type: "success", title: "Signed in", message: "Welcome back." });
      }

      finishAuth(readyUser || mapFirebaseUserFallback(authUser));
    } catch (error) {
      setLoginError(mapLoginError(error));
      focusById("login-password");
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

    clearErrors();
    setIsResettingPassword(true);

    try {
      await sendCustomerPasswordReset(normalizeEmailInput(email));
      pushToast({
        type: "success",
        title: "Reset link sent",
        message: `If an account exists for ${normalizeEmailInput(email)}, a reset link is on its way. Check spam too.`,
      });
      setResetCooldownSeconds(RESET_COOLDOWN_SECONDS);
    } catch (error) {
      const message = getFirebaseAuthErrorMessage(error);
      setSubmitError(message);
      pushToast({ type: "error", title: "Couldn't send reset link", message });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendOtp = async (phoneNumber, verifier) => {
    await prepareSignIn();
    return signInWithPhoneOtp(phoneNumber, verifier);
  };

  const handleVerifyOtp = async (confirmationResult, code) => {
    const credential = await confirmationResult.confirm(code);
    const readyUser = await primeAuthenticatedSession(credential.user);
    completeSignIn();
    finishAuth(readyUser || mapFirebaseUserFallback(credential.user));
  };

  return (
    <>
      <AuthToast toast={toast} onDismiss={dismiss} />

      <div className="auth-card-stack">
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
                clearErrors();
              }}
              onBlur={() => setTouchedFields((currentValue) => ({ ...currentValue, email: true }))}
              disabled={isEmailSubmitting}
              autoFocus
            />
          </InputField>

          <PasswordField
            id="login-password"
            label="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearErrors();
            }}
            onBlur={() => setTouchedFields((currentValue) => ({ ...currentValue, password: true }))}
            error={touchedFields.password ? validationErrors.password : ""}
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={isEmailSubmitting}
          />

          <div className="auth-form-meta">
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
          <p className="text-sm text-ink-500">You'll stay signed in on this device until you log out.</p>

          {loginError ? (
            <div className="auth-error" role="alert">
              <p>{loginError.message}</p>
              {loginError.showReset || loginError.showRegister ? (
                <p className="auth-error-actions">
                  {loginError.showReset ? (
                    <button
                      type="button"
                      className="auth-error-link"
                      onClick={handleForgotPassword}
                      disabled={isResettingPassword || resetCooldownSeconds > 0}
                    >
                      {resetCooldownSeconds > 0 ? `Reset password (${resetCooldownSeconds}s)` : "Reset password ->"}
                    </button>
                  ) : null}
                  {loginError.showRegister ? (
                    <Link className="auth-error-link" to="/register">
                      Create your account {"->"}
                    </Link>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : submitError ? (
            <p className="field-error auth-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <button type="submit" className="auth-submit-button" disabled={!canSubmit}>
            {isEmailSubmitting ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                Signing In...
              </>
            ) : (
              "Login with Password"
            )}
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
