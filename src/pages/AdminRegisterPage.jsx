import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import { useAdminAuth } from "../context/AdminAuthContext";
import { GOOGLE_AUTH_URL } from "../lib/api";
import { detectLoginType, normalizeMobileInput } from "../utils/authDetection";

function AdminRegisterPage() {
  const navigate = useNavigate();
  const { completeOtpAuth, registerWithEmail, requestOtp } = useAdminAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequestedFor, setOtpRequestedFor] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerType = useMemo(() => detectLoginType(identifier), [identifier]);
  const isMobileRegister = registerType === "mobile";
  const isEmailRegister = registerType === "email";

  const handleIdentifierChange = (rawValue) => {
    const nextType = detectLoginType(rawValue);
    const nextValue = nextType === "mobile" ? normalizeMobileInput(rawValue) : rawValue;

    setIdentifier(nextValue);
    setPassword("");
    setOtp("");
    setOtpRequestedFor("");
    setOtpPreview("");
    setError("");
    setSuccessMessage("");
  };

  const handleEmailRegister = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await registerWithEmail(identifier, password);
      navigate("/admin/orders", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Unable to create the account.");
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
      setSuccessMessage("OTP sent successfully. Verify it to create or access the account.");
    } catch (submitError) {
      setError(submitError.message || "Unable to send OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMobileRegister = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await completeOtpAuth(identifier, otp);
      navigate("/admin/orders", { replace: true });
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
          <p className="eyebrow">Register</p>
          <h2>Create an account with email, mobile OTP, or Google.</h2>
          <p className="section-copy">Use email with a password, or use your mobile number and verify with OTP.</p>
        </div>

        <form className="delivery-form-card admin-login-form" onSubmit={isMobileRegister ? handleMobileRegister : handleEmailRegister}>
          <InputField
            label="Email or Mobile Number"
            htmlFor="register-identifier"
            helperText={isEmailRegister ? "Email registration detected." : isMobileRegister ? "Mobile registration detected." : "Use a valid email or 10-digit mobile number."}
          >
            <input
              id="register-identifier"
              type="text"
              value={identifier}
              onChange={(event) => handleIdentifierChange(event.target.value)}
            />
          </InputField>

          {isEmailRegister ? (
            <InputField label="Password" htmlFor="register-password">
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </InputField>
          ) : null}

          {isMobileRegister && otpRequestedFor === identifier ? (
            <InputField
              label="OTP"
              htmlFor="register-otp"
              helperText={otpPreview ? `Development OTP: ${otpPreview}` : "Enter the 6-digit OTP sent to your phone."}
            >
              <input
                id="register-otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(normalizeMobileInput(event.target.value).slice(0, 6))}
              />
            </InputField>
          ) : null}

          <div className="auth-actions-grid">
            <button
              type={isEmailRegister ? "submit" : "button"}
              className="primary-button"
              disabled={isSubmitting || !isEmailRegister || !password.trim()}
            >
              {isSubmitting && isEmailRegister ? "Creating..." : "Register with Email"}
            </button>

            <button
              type={isMobileRegister && otpRequestedFor === identifier ? "submit" : "button"}
              className="secondary-button"
              disabled={isSubmitting || !isMobileRegister || identifier.length !== 10}
              onClick={isMobileRegister && otpRequestedFor !== identifier ? handleSendOtp : undefined}
            >
              {isSubmitting && isMobileRegister
                ? otpRequestedFor === identifier
                  ? "Verifying..."
                  : "Sending OTP..."
                : otpRequestedFor === identifier
                  ? "Verify OTP"
                  : "Register with OTP"}
            </button>

            <button type="button" className="secondary-button social-button" onClick={() => window.location.assign(GOOGLE_AUTH_URL)}>
              Continue with Google
            </button>
          </div>
        </form>

        {error ? <p className="field-error">{error}</p> : null}
        {successMessage ? <p className="submit-message">{successMessage}</p> : null}

        <div className="action-row">
          <Link className="mini-link" to="/admin/login">
            Back to login
          </Link>
          <Link className="mini-link" to="/">
            Back to storefront
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AdminRegisterPage;
