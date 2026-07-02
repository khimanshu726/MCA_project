import { useMemo, useRef, useState } from "react";
import { RecaptchaVerifier } from "firebase/auth";
import { ensureFirebaseAuth } from "../lib/firebase";
import { getFirebaseAuthErrorMessage } from "../utils/firebaseAuthErrors";
import { normalizeMobileInput } from "../utils/authDetection";
import { serializeFirebaseError, toE164IndianNumber } from "../utils/phoneValidation";
import { useOtpTimer } from "../hooks/useOtpTimer";
import InputField from "./InputField";

const OTP_RESEND_SECONDS = 30;

function PhoneOtpForm({ mode = "login", onSendOtp, onVerifyOtp, isBusy = false, isConfigured = true }) {
  const recaptchaContainerId = `${mode}-phone-recaptcha`;
  const verifierRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [mobile, setMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { seconds: resendSeconds, start: startResendTimer } = useOtpTimer(0);

  const isOtpStep = Boolean(confirmationResult);

  const canSendOtp = useMemo(
    () => isConfigured && !isBusy && !isSendingOtp && normalizeMobileInput(mobile).length === 10,
    [isBusy, isConfigured, isSendingOtp, mobile],
  );

  const canVerifyOtp = useMemo(
    () => isConfigured && !isBusy && !isVerifyingOtp && isOtpStep && otpCode.trim().length === 6,
    [isBusy, isConfigured, isOtpStep, isVerifyingOtp, otpCode],
  );

  const getVerifier = async () => {
    if (verifierRef.current) return verifierRef.current;

    const auth = ensureFirebaseAuth();
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: "invisible",
      callback: () => undefined,
      "expired-callback": () => setMessage("The verification session expired. Request a new OTP."),
    });

    widgetIdRef.current = await verifier.render();
    verifierRef.current = verifier;
    return verifier;
  };

  const resetRecaptcha = async () => {
    const widgetId = widgetIdRef.current;
    if (typeof window !== "undefined" && widgetId !== null && window.grecaptcha?.reset) {
      window.grecaptcha.reset(widgetId);
      return;
    }
    if (verifierRef.current) {
      widgetIdRef.current = await verifierRef.current.render();
    }
  };

  const handleSendOtp = async () => {
    setError("");
    setMessage("");
    setOtpCode("");

    const phoneNumber = toE164IndianNumber(mobile);
    if (!phoneNumber) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setIsSendingOtp(true);
    try {
      const verifier = await getVerifier();
      const result = await onSendOtp(phoneNumber, verifier);
      setConfirmationResult(result);
      setMessage(`OTP sent to ${phoneNumber}. Standard SMS rates may apply.`);
      startResendTimer(OTP_RESEND_SECONDS);
    } catch (submitError) {
      console.error(`[Phone OTP] send failed ${JSON.stringify(serializeFirebaseError(submitError))}`);
      setError(getFirebaseAuthErrorMessage(submitError));
      await resetRecaptcha();
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (otpCode.trim().length !== 6 || !confirmationResult) {
      setError("Enter the 6-digit OTP sent to your phone.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await onVerifyOtp(confirmationResult, otpCode.trim());
    } catch (submitError) {
      console.error(`[Phone OTP] verify failed ${JSON.stringify(serializeFirebaseError(submitError))}`);
      setError(getFirebaseAuthErrorMessage(submitError));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || isSendingOtp) return;
    setConfirmationResult(null);
    await handleSendOtp();
  };

  const handleMobileChange = (event) => {
    setMobile(normalizeMobileInput(event.target.value));
    setError("");
    setMessage("");
  };

  const handleOtpChange = (event) => {
    setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  return (
    <div className="auth-phone-panel">
      <div className="auth-divider"><span>or use your mobile number</span></div>

      <div className="auth-phone-grid">
        <InputField
          label="Phone Number"
          htmlFor={`${mode}-phone-number`}
          helperText="Enter your 10-digit Indian mobile number. We will send a real OTP via Firebase Phone Auth."
        >
          <input
            id={`${mode}-phone-number`}
            className="auth-modern-input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="9876543210"
            value={mobile}
            onChange={handleMobileChange}
            disabled={isBusy || isSendingOtp || isVerifyingOtp}
          />
        </InputField>

        <button type="button" className="auth-submit-button" onClick={handleSendOtp} disabled={!canSendOtp}>
          {isSendingOtp ? "Sending OTP..." : isOtpStep ? "Send OTP Again" : "Send OTP"}
        </button>
      </div>

      <div id={recaptchaContainerId} className="auth-recaptcha-slot" />

      {isOtpStep ? (
        <form className="auth-modern-form auth-otp-form" onSubmit={handleVerifyOtp}>
          <InputField
            label="One-Time Password"
            htmlFor={`${mode}-otp-code`}
            helperText="Enter the 6-digit code sent to your phone."
          >
            <input
              id={`${mode}-otp-code`}
              className="auth-modern-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter OTP"
              value={otpCode}
              onChange={handleOtpChange}
              disabled={isBusy || isVerifyingOtp}
            />
          </InputField>

          <div className="auth-otp-actions">
            <button type="submit" className="auth-submit-button" disabled={!canVerifyOtp}>
              {isVerifyingOtp ? "Verifying..." : mode === "register" ? "Create account with OTP" : "Verify OTP"}
            </button>
            <button
              type="button"
              className="auth-secondary-button"
              onClick={handleResendOtp}
              disabled={resendSeconds > 0 || isBusy || isSendingOtp}
            >
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      ) : null}

      {message ? <p className="auth-inline-helper auth-info">{message}</p> : null}
      {error ? <p className="field-error auth-error">{error}</p> : null}

      {!isConfigured ? (
        <p className="field-error auth-error">
          Firebase environment variables are missing. Configure the app before using phone sign-in.
        </p>
      ) : null}
    </div>
  );
}

export default PhoneOtpForm;
