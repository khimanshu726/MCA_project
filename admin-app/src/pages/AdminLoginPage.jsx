import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import { STOREFRONT_URL } from "../lib/adminAppUrls";
import { useAdminAuth } from "../context/AdminAuthContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeOtpAuth, requestOtp, signInWithPassword } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpPreview, setOtpPreview] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const destination = location.state?.from || "/admin/orders";
  const isEmailValid = useMemo(() => EMAIL_PATTERN.test(email.trim().toLowerCase()), [email]);

  const resetFeedback = () => {
    setError("");
    setSuccessMessage("");
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    // Any change invalidates a code that was sent to the previous address.
    setOtpRequested(false);
    setOtp("");
    setOtpPreview("");
    resetFeedback();
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    resetFeedback();
    setIsSubmitting(true);

    try {
      await signInWithPassword(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCode = async () => {
    resetFeedback();
    setIsSendingCode(true);

    try {
      const response = await requestOtp(email.trim());
      setOtpRequested(true);
      setOtpPreview(response.devOtp || "");
      setSuccessMessage(
        "If an admin account exists for this email, a sign-in code is on its way. Check your inbox and spam.",
      );
    } catch (submitError) {
      setError(submitError.message || "Unable to send a sign-in code.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleOtpLogin = async (event) => {
    event.preventDefault();
    resetFeedback();
    setIsSubmitting(true);

    try {
      await completeOtpAuth(email.trim(), otp.trim());
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Unable to verify the code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-stack">
      <section className="section-panel admin-login-panel">
        <div className="section-heading">
          <p className="eyebrow">Admin Login</p>
          <h2>Sign in with your email</h2>
          <p className="section-copy">
            Use your admin email with a password, or get a one-time code sent to your inbox.
          </p>
        </div>

        <form className="delivery-form-card admin-login-form" onSubmit={handlePasswordLogin}>
          <InputField
            label="Email address"
            htmlFor="admin-email"
            helperText={
              email && !isEmailValid ? "Enter a valid email address." : "The email registered to your admin account."
            }
          >
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => handleEmailChange(event.target.value)}
            />
          </InputField>

          <InputField label="Password" htmlFor="admin-password">
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </InputField>

          <button type="submit" className="primary-button" disabled={isSubmitting || !isEmailValid || !password.trim()}>
            {isSubmitting ? "Signing in..." : "Login with Password"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or use a one-time code</span>
        </div>

        <form className="delivery-form-card admin-login-form" onSubmit={handleOtpLogin}>
          {otpRequested ? (
            <InputField
              label="Sign-in code"
              htmlFor="admin-otp"
              helperText={otpPreview ? `Development code: ${otpPreview}` : "Enter the 6-digit code sent to your email."}
            >
              <input
                id="admin-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </InputField>
          ) : null}

          <div className="auth-actions-grid">
            <button
              type="button"
              className="secondary-button"
              onClick={handleSendCode}
              disabled={isSendingCode || !isEmailValid}
            >
              {isSendingCode ? "Sending code..." : otpRequested ? "Resend code" : "Email me a sign-in code"}
            </button>

            {otpRequested ? (
              <button type="submit" className="primary-button" disabled={isSubmitting || otp.length !== 6}>
                {isSubmitting ? "Verifying..." : "Verify & sign in"}
              </button>
            ) : null}
          </div>
        </form>

        {error ? <p className="field-error">{error}</p> : null}
        {successMessage ? <p className="submit-message">{successMessage}</p> : null}

        <div className="action-row">
          <a className="mini-link" href={STOREFRONT_URL}>
            Back to storefront
          </a>
        </div>
      </section>
    </main>
  );
}

export default AdminLoginPage;
