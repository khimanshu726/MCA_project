import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import InputField from "../components/InputField";
import { useUserAuth } from "../context/UserAuthContext";
import { detectLoginType, normalizeMobileInput } from "../utils/authDetection";

function UserLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signIn } = useUserAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <main className="page-stack">
      <section className="section-panel auth-panel">
        <div className="section-heading">
          <p className="eyebrow">Customer Login</p>
          <h2>Sign in with your email address or phone number.</h2>
          <p className="section-copy">Use the same password whether you registered with email or with your 10-digit mobile number.</p>
        </div>

        <form className="delivery-form-card admin-login-form" onSubmit={handleSubmit}>
          <InputField
            label="Email or Phone Number"
            htmlFor="customer-login-identifier"
            helperText={
              loginType === "email"
                ? "Email login detected."
                : loginType === "mobile"
                  ? "Phone login detected."
                  : "Enter a valid email address or 10-digit mobile number."
            }
          >
            <input
              id="customer-login-identifier"
              type="text"
              value={identifier}
              onChange={(event) => handleIdentifierChange(event.target.value)}
            />
          </InputField>

          <InputField label="Password" htmlFor="customer-login-password">
            <input
              id="customer-login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </InputField>

          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting || detectLoginType(identifier) === "unknown" || !password.trim()}
          >
            {isSubmitting ? "Signing In..." : "Login"}
          </button>
        </form>

        {error ? <p className="field-error">{error}</p> : null}

        <div className="action-row">
          <Link className="mini-link" to="/register">
            Create new account
          </Link>
          <Link className="mini-link" to="/">
            Back to storefront
          </Link>
        </div>
      </section>
    </main>
  );
}

export default UserLoginPage;
