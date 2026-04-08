import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import { useAdminAuth } from "../context/AdminAuthContext";
import { GOOGLE_AUTH_URL } from "../lib/api";
import { detectLoginType, normalizeMobileInput } from "../utils/authDetection";

function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeOtpAuth, requestOtp, signInWithPassword } = useAdminAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequestedFor, setOtpRequestedFor] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from || "/admin/orders";
  const loginType = useMemo(() => detectLoginType(identifier), [identifier]);
  const isMobileLogin = loginType === "mobile";
  const isEmailLogin = loginType === "email";

  const handleIdentifierChange = (rawValue) => {
    const nextLoginType = detectLoginType(rawValue);
    const nextValue = nextLoginType === "mobile" ? normalizeMobileInput(rawValue) : rawValue;

    setIdentifier(nextValue);
    setPassword("");
    setOtp("");
    setOtpRequestedFor("");
    setOtpPreview("");
    setError("");
    setSuccessMessage("");
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await signInWithPassword(identifier, password);
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await requestOtp(identifier);
      setOtpRequestedFor(identifier);
      setOtpPreview(response.devOtp || "");
      setSuccessMessage("OTP sent successfully. Enter it below to continue.");
    } catch (submitError) {
      setError(submitError.message || "Unable to send OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await completeOtpAuth(identifier, otp);
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Unable to verify OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-stack">
      <section className="section-panel admin-login-panel">
        <div className="section-heading">
          <p className="eyebrow">Admin Login</p>
          <h2>Sign in with email, mobile OTP, or Google.</h2>
          <p className="section-copy">Enter your email address or 10-digit mobile number to continue.</p>
        </div>

        <form className="delivery-form-card admin-login-form" onSubmit={isMobileLogin ? handleOtpLogin : handlePasswordLogin}>
          <InputField
            label="Email or Mobile Number"
            htmlFor="auth-identifier"
            helperText={isEmailLogin ? "Email login detected." : isMobileLogin ? "Mobile login detected." : "Use a valid email or 10-digit mobile number."}
          >
            <input
              id="auth-identifier"
              type="text"
              value={identifier}
              onChange={(event) => handleIdentifierChange(event.target.value)}
            />
          </InputField>

          {isEmailLogin ? (
            <InputField label="Password" htmlFor="auth-password">
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </InputField>
          ) : null}

          {isMobileLogin && otpRequestedFor === identifier ? (
            <InputField
              label="OTP"
              htmlFor="auth-otp"
              helperText={otpPreview ? `Development OTP: ${otpPreview}` : "Enter the 6-digit OTP sent to your phone."}
            >
              <input
                id="auth-otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(normalizeMobileInput(event.target.value).slice(0, 6))}
              />
            </InputField>
          ) : null}

          <div className="auth-actions-grid">
            <button
              type={isEmailLogin ? "submit" : "button"}
              className="primary-button"
              disabled={isSubmitting || !isEmailLogin || !password.trim()}
              onClick={isEmailLogin ? undefined : () => {}}
            >
              {isSubmitting && isEmailLogin ? "Logging in..." : "Login with Password"}
            </button>

            <button
              type={isMobileLogin && otpRequestedFor === identifier ? "submit" : "button"}
              className="secondary-button"
              disabled={isSubmitting || !isMobileLogin || identifier.length !== 10}
              onClick={isMobileLogin && otpRequestedFor !== identifier ? handleSendOtp : undefined}
            >
              {isSubmitting && isMobileLogin
                ? otpRequestedFor === identifier
                  ? "Verifying..."
                  : "Sending OTP..."
                : otpRequestedFor === identifier
                  ? "Login with OTP"
                  : "Send OTP"}
            </button>

            <button type="button" className="secondary-button social-button" onClick={() => window.location.assign(GOOGLE_AUTH_URL)}>
              Continue with Google
            </button>
          </div>
        </form>

        {error ? <p className="field-error">{error}</p> : null}
        {successMessage ? <p className="submit-message">{successMessage}</p> : null}

        <div className="action-row">
          <Link className="mini-link" to="/admin/register">
            Create account
          </Link>
          <Link className="mini-link" to="/">
            Back to storefront
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AdminLoginPage;
