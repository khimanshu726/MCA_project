import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthSplitShell from "../components/AuthSplitShell";
import { useUserAuth } from "../context/UserAuthContext";
import { detectLoginType, normalizeMobileInput } from "../utils/authDetection";

function UserRegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, signUp } = useUserAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerType = useMemo(() => detectLoginType(identifier), [identifier]);

  if (isAuthenticated) {
    return <Navigate to="/account" replace />;
  }

  const handleIdentifierChange = (rawValue) => {
    const nextType = detectLoginType(rawValue);
    const nextValue = nextType === "mobile" ? normalizeMobileInput(rawValue) : rawValue;
    setIdentifier(nextValue);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      await signUp(identifier, password);
      navigate("/account", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const helperCopy =
    registerType === "email"
      ? "Email registration detected"
      : registerType === "mobile"
        ? "Phone registration detected"
        : "Use your email address or 10-digit mobile number";

  return (
    <AuthSplitShell
      eyebrow="Create your account"
      title="Start ordering with Elite Empressions"
      subtitle="Register once to save your cart, manage delivery details, and move faster through checkout."
      promptText="Already registered?"
      promptLinkTo="/login"
      promptLinkLabel="Login"
      leftHeadline="Everything you need for custom print ordering in one account."
      leftCaption="Sign up to browse print products, save delivery details, and place personalized orders without starting from scratch every time."
      highlights={[
        "Register with your email address or mobile number.",
        "Save account details for repeat print orders and faster checkout.",
        "Access custom products, uploads, and order-ready delivery flow anytime.",
      ]}
    >
      <form className="auth-modern-form" onSubmit={handleSubmit}>
        <label className="auth-input-label" htmlFor="customer-register-identifier">
          Email or phone number
        </label>
        <input
          id="customer-register-identifier"
          className="auth-modern-input"
          type="text"
          placeholder="Enter email or phone number"
          value={identifier}
          onChange={(event) => handleIdentifierChange(event.target.value)}
        />

        <p className="auth-inline-helper">{helperCopy}</p>

        <label className="auth-input-label" htmlFor="customer-register-password">
          Password
        </label>
        <div className="auth-password-wrap">
          <input
            id="customer-register-password"
            className="auth-modern-input auth-password-input"
            type={showPassword ? "text" : "password"}
            placeholder="Create password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((currentValue) => !currentValue)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <label className="auth-input-label" htmlFor="customer-register-confirm">
          Confirm password
        </label>
        <div className="auth-password-wrap">
          <input
            id="customer-register-confirm"
            className="auth-modern-input auth-password-input"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error ? <p className="field-error auth-error">{error}</p> : null}

        <button
          type="submit"
          className="auth-submit-button"
          disabled={isSubmitting || registerType === "unknown" || !password.trim() || !confirmPassword.trim()}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <div className="auth-footer-links">
          <Link to="/login">Already have an account?</Link>
        </div>
      </form>
    </AuthSplitShell>
  );
}

export default UserRegisterPage;
