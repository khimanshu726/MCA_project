import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { buildLoginErrors, hasErrors, normalizeEmailInput } from "../utils/authValidation";
import { getFirebaseAuthErrorMessage } from "../utils/firebaseAuthErrors";

function CustomerLoginCard({ destination = "/account" }) {
  const navigate = useNavigate();
  const { isLoading, refreshProfile, signInWithPhoneOtp } = useUserAuth();
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
      if (providerType === "facebook") {
        await signInCustomerWithFacebook();
      } else {
        await signInCustomerWithGoogle();
      }

      await refreshProfile();
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
      await signInCustomerWithEmail({
        email: normalizeEmailInput(email),
        password,
      });
      await refreshProfile();
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

    setSubmitError("");
    setIsResettingPassword(true);

    try {
      await sendCustomerPasswordReset(normalizeEmailInput(email));
      pushToast({
        type: "success",
        title: "Password reset sent",
        message: "Check your inbox for a secure password reset link.",
      });
    } catch (error) {
      setSubmitError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendOtp = async (phoneNumber, verifier) => signInWithPhoneOtp(phoneNumber, verifier);

  const handleVerifyOtp = async (confirmationResult, code) => {
    await confirmationResult.confirm(code);
    await refreshProfile();
    navigate(destination, { replace: true });
  };

  return (
    <>
      <AuthToast toast={toast} onDismiss={dismiss} />

      <div className="auth-card-stack">
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
            <button
              type="button"
              className="auth-text-button"
              onClick={handleForgotPassword}
              disabled={isResettingPassword || isEmailSubmitting || isProviderBusy}
            >
              {isResettingPassword ? "Sending reset link..." : "Forgot Password?"}
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
