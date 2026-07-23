import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthProviderButtons from "./AuthProviderButtons";
import AuthToast from "./AuthToast";
import InputField from "./InputField";
import PasswordChecklist from "./PasswordChecklist";
import PasswordField from "./PasswordField";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../hooks/useToast";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  registerCustomerWithEmail,
  signInCustomerWithGoogle,
} from "../services/customerAuthService";
import {
  buildRegisterErrors,
  getPasswordChecks,
  hasErrors,
  normalizeEmailInput,
  sanitizeNameInput,
} from "../utils/authValidation";
import { getFirebaseAuthErrorMessage } from "../utils/firebaseAuthErrors";

const defaultFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptedTerms: false,
};

function CustomerRegisterCard({ destination = "/", onAuthenticated = null }) {
  const navigate = useNavigate();
  const firstFieldRef = useRef(null);

  // Standalone /register page navigates to `destination`; the auth modal passes
  // `onAuthenticated` to close in place and resume the interrupted action.
  const finishAuth = (user) => {
    if (onAuthenticated) {
      onAuthenticated(user);
    } else {
      navigate(destination, { replace: true });
    }
  };
  const { isLoading, refreshProfile } = useUserAuth();
  const { toast, pushToast, dismiss } = useToast();
  const [formState, setFormState] = useState(defaultFormState);
  const [touchedFields, setTouchedFields] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProviderBusy, setIsProviderBusy] = useState(false);

  const validationErrors = useMemo(() => buildRegisterErrors(formState), [formState]);
  const passwordChecks = useMemo(() => getPasswordChecks(formState.password), [formState.password]);
  const canSubmit =
    isFirebaseConfigured &&
    !isLoading &&
    !isSubmitting &&
    !isProviderBusy &&
    !hasErrors(validationErrors);

  const getFieldError = (fieldName) => {
    if (fieldName === "acceptedTerms") {
      return touchedFields[fieldName] ? validationErrors[fieldName] : "";
    }

    if (!touchedFields[fieldName] && !String(formState[fieldName] || "").trim()) {
      return "";
    }

    return validationErrors[fieldName];
  };

  const handleBlur = (fieldName) => {
    setTouchedFields((currentValue) => ({ ...currentValue, [fieldName]: true }));
  };

  const updateField = (fieldName, value) => {
    setFormState((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
    setSubmitError("");
  };

  const handleGoogleRegister = async () => {
    if (!isFirebaseConfigured) {
      setSubmitError("Firebase authentication is not configured yet.");
      return;
    }

    setSubmitError("");
    setIsProviderBusy(true);

    try {
      await signInCustomerWithGoogle();
      const user = await refreshProfile();
      pushToast({
        type: "success",
        title: "Signed in successfully",
        message: "Your Google account is ready to use with Elite Empressions.",
      });
      finishAuth(user);
    } catch (error) {
      setSubmitError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsProviderBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouchedFields({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
      acceptedTerms: true,
    });

    if (!isFirebaseConfigured) {
      setSubmitError("Firebase authentication is not configured yet.");
      return;
    }

    if (hasErrors(validationErrors)) {
      setSubmitError("Please correct the highlighted fields before creating your account.");
      firstFieldRef.current?.focus();
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      await registerCustomerWithEmail({
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        email: normalizeEmailInput(formState.email),
        password: formState.password,
      });

      const user = await refreshProfile();
      pushToast({
        type: "success",
        title: "Account created",
        message: "Please verify your email before accessing all features.",
      });
      finishAuth(user);
    } catch (error) {
      setSubmitError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordsMatch =
    formState.confirmPassword.length > 0 && formState.password === formState.confirmPassword;

  return (
    <>
      <AuthToast toast={toast} onDismiss={dismiss} />

      <div className="auth-card-stack">
        <AuthProviderButtons
          isBusy={!isFirebaseConfigured || isLoading || isSubmitting || isProviderBusy}
          onGoogle={handleGoogleRegister}
          showFacebook={false}
          googleLabel="Continue with Google"
        />

        <div className="auth-divider">
          <span>or register with email</span>
        </div>

        <form className="auth-modern-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-grid-2">
            <InputField label="First Name" htmlFor="register-first-name" error={getFieldError("firstName")}>
              <input
                id="register-first-name"
                ref={firstFieldRef}
                type="text"
                autoComplete="given-name"
                placeholder="Enter first name"
                value={formState.firstName}
                onChange={(event) => updateField("firstName", sanitizeNameInput(event.target.value))}
                onBlur={() => handleBlur("firstName")}
                autoFocus
                aria-invalid={Boolean(getFieldError("firstName"))}
              />
            </InputField>

            <InputField label="Last Name" htmlFor="register-last-name" error={getFieldError("lastName")}>
              <input
                id="register-last-name"
                type="text"
                autoComplete="family-name"
                placeholder="Enter last name"
                value={formState.lastName}
                onChange={(event) => updateField("lastName", sanitizeNameInput(event.target.value))}
                onBlur={() => handleBlur("lastName")}
                aria-invalid={Boolean(getFieldError("lastName"))}
              />
            </InputField>
          </div>

          <InputField label="Email Address" htmlFor="register-email" error={getFieldError("email")}>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={formState.email}
              onChange={(event) => updateField("email", event.target.value)}
              onBlur={() => handleBlur("email")}
              aria-invalid={Boolean(getFieldError("email"))}
            />
          </InputField>

          <PasswordField
            id="register-password"
            label="Password"
            value={formState.password}
            onChange={(event) => updateField("password", event.target.value)}
            onBlur={() => handleBlur("password")}
            error={touchedFields.password ? validationErrors.password : ""}
            autoComplete="new-password"
            placeholder="Create a strong password"
          />

          <PasswordChecklist checks={passwordChecks} />

          <PasswordField
            id="register-confirm-password"
            label="Confirm Password"
            value={formState.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            onBlur={() => handleBlur("confirmPassword")}
            error={touchedFields.confirmPassword ? validationErrors.confirmPassword : ""}
            helperText={
              formState.confirmPassword
                ? passwordsMatch
                  ? "Passwords match."
                  : "Passwords do not match."
                : "Re-enter your password to confirm it."
            }
            autoComplete="new-password"
            placeholder="Confirm your password"
          />

          <label className="auth-checkbox-row" htmlFor="register-terms">
            <input
              id="register-terms"
              type="checkbox"
              checked={formState.acceptedTerms}
              onChange={(event) => updateField("acceptedTerms", event.target.checked)}
              onBlur={() => handleBlur("acceptedTerms")}
            />
            <span>I agree to the Terms &amp; Privacy Policy</span>
          </label>
          {getFieldError("acceptedTerms") ? (
            <p className="field-error">{getFieldError("acceptedTerms")}</p>
          ) : null}

          {submitError ? <p className="field-error auth-error">{submitError}</p> : null}

          <button
            type="submit"
            className="auth-submit-button"
            disabled={!canSubmit}
          >
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>

        {!isFirebaseConfigured ? (
          <div className="auth-config-warning">
            <p className="field-error auth-error">
              Firebase authentication is not configured yet. Add the required environment variables to enable
              registration.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default CustomerRegisterCard;
