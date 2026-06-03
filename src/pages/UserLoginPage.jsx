import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthSplitShell from "../components/AuthSplitShell";
import { useUserAuth } from "../context/UserAuthContext";
import { detectLoginType, normalizeMobileInput } from "../utils/authDetection";

function UserLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signIn } = useUserAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginType = useMemo(() => detectLoginType(identifier), [identifier]);
  const destination = location.state?.from || "/account";

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

    try {
      await signIn(identifier, password);
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const helperCopy =
    loginType === "email"
      ? "Email login detected"
      : loginType === "mobile"
        ? "Phone login detected"
        : "Use your email address or 10-digit mobile number";

  return (
    <AuthSplitShell
      eyebrow="Welcome back!"
      title="Login to your account"
      subtitle="Use your customer account to continue with saved cart items, delivery details, and print-ready orders."
      promptText="Not registered?"
      promptLinkTo="/register"
      promptLinkLabel="Create an account"
    >
      <form className="auth-modern-form" onSubmit={handleSubmit}>
        <label className="auth-input-label" htmlFor="customer-login-identifier">
          Email or phone number
        </label>
        <input
          id="customer-login-identifier"
          className="auth-modern-input"
          type="text"
          placeholder="Enter email or phone number"
          value={identifier}
          onChange={(event) => handleIdentifierChange(event.target.value)}
        />

        <p className="auth-inline-helper">{helperCopy}</p>

        <label className="auth-input-label" htmlFor="customer-login-password">
          Password
        </label>
        <div className="auth-password-wrap">
          <input
            id="customer-login-password"
            className="auth-modern-input auth-password-input"
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
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

        {error ? <p className="field-error auth-error">{error}</p> : null}

        <button
          type="submit"
          className="auth-submit-button"
          disabled={isSubmitting || detectLoginType(identifier) === "unknown" || !password.trim()}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>

        <div className="auth-footer-links">
          <Link to="/register">Create new account</Link>
          <button type="button" className="auth-text-button" disabled>
            Forgot password
          </button>
        </div>
      </form>
    </AuthSplitShell>
  );
}

export default UserLoginPage;
