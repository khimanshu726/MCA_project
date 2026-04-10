import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import { useUserAuth } from "../context/UserAuthContext";
import { detectLoginType, normalizeMobileInput } from "../utils/authDetection";

function UserRegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, signUp } = useUserAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  return (
    <main className="page-stack">
      <section className="section-panel auth-panel">
        <div className="section-heading">
          <p className="eyebrow">Customer Register</p>
          <h2>Create your Elite Empressions account.</h2>
          <p className="section-copy">Register with either an email address or your 10-digit mobile number and a password.</p>
        </div>

        <form className="delivery-form-card admin-login-form" onSubmit={handleSubmit}>
          <InputField
            label="Email or Phone Number"
            htmlFor="customer-register-identifier"
            helperText={
              registerType === "email"
                ? "Email registration detected."
                : registerType === "mobile"
                  ? "Phone registration detected."
                  : "Enter a valid email address or 10-digit mobile number."
            }
          >
            <input
              id="customer-register-identifier"
              type="text"
              value={identifier}
              onChange={(event) => handleIdentifierChange(event.target.value)}
            />
          </InputField>

          <InputField label="Password" htmlFor="customer-register-password" helperText="Use at least 8 characters.">
            <input
              id="customer-register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </InputField>

          <InputField label="Confirm Password" htmlFor="customer-register-confirm">
            <input
              id="customer-register-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </InputField>

          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting || registerType === "unknown" || !password.trim() || !confirmPassword.trim()}
          >
            {isSubmitting ? "Creating Account..." : "Register"}
          </button>
        </form>

        {error ? <p className="field-error">{error}</p> : null}

        <div className="action-row">
          <Link className="mini-link" to="/login">
            Already have an account?
          </Link>
          <Link className="mini-link" to="/">
            Back to storefront
          </Link>
        </div>
      </section>
    </main>
  );
}

export default UserRegisterPage;
