import { useRef, useState } from "react";
import { RecaptchaVerifier } from "firebase/auth";
import { ensureFirebaseAuth } from "../lib/firebase";
import { getFirebaseAuthErrorMessage } from "../utils/firebaseAuthErrors";
import { normalizeMobileInput } from "../utils/authDetection";
import { devError } from "../utils/logger";
import { serializeFirebaseError, toE164IndianNumber } from "../utils/phoneValidation";
import { useOtpTimer } from "./useOtpTimer";

const OTP_RESEND_SECONDS = 30;

/**
 * Encapsulates the entire Firebase phone-OTP flow (recaptcha, send, verify,
 * resend) so the PhoneOtpForm component stays presentational.
 */
export function usePhoneOtpFlow({ recaptchaContainerId, onSendOtp, onVerifyOtp }) {
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

  const getVerifier = async () => {
    if (verifierRef.current) return verifierRef.current;
    const auth = ensureFirebaseAuth();
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: "invisible",
      callback: () => undefined,
      "expired-callback": () =>
        setMessage("The verification session expired. Request a new OTP."),
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

  const sendOtp = async () => {
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
      devError("[Phone OTP] send failed", serializeFirebaseError(submitError));
      setError(getFirebaseAuthErrorMessage(submitError));
      await resetRecaptcha();
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async (event) => {
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
      devError("[Phone OTP] verify failed", serializeFirebaseError(submitError));
      setError(getFirebaseAuthErrorMessage(submitError));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const resendOtp = async () => {
    if (resendSeconds > 0 || isSendingOtp) return;
    setConfirmationResult(null);
    await sendOtp();
  };

  const changeMobile = (event) => {
    setMobile(normalizeMobileInput(event.target.value));
    setError("");
    setMessage("");
  };

  const changeOtp = (event) => {
    setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  return {
    mobile,
    otpCode,
    isOtpStep,
    isSendingOtp,
    isVerifyingOtp,
    resendSeconds,
    error,
    message,
    sendOtp,
    verifyOtp,
    resendOtp,
    changeMobile,
    changeOtp,
  };
}
