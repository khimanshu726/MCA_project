import { useMemo } from "react";
import InputField from "./InputField";

const resolveVerifyLabel = (isVerifyingOtp, mode) => {
  if (isVerifyingOtp) return "Verifying...";
  if (mode === "register") return "Create account with OTP";
  return "Verify OTP";
};

function OtpVerifyStep({
  mode,
  otpCode,
  onOtpChange,
  onVerify,
  onResend,
  resendSeconds,
  isVerifyingOtp,
  isSendingOtp,
  isBusy,
  isConfigured,
}) {
  const canVerifyOtp = useMemo(
    () => isConfigured && !isBusy && !isVerifyingOtp && otpCode.trim().length === 6,
    [isBusy, isConfigured, isVerifyingOtp, otpCode],
  );

  return (
    <form className="auth-modern-form auth-otp-form" onSubmit={onVerify}>
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
          onChange={onOtpChange}
          disabled={isBusy || isVerifyingOtp}
        />
      </InputField>

      <div className="auth-otp-actions">
        <button type="submit" className="auth-submit-button" disabled={!canVerifyOtp}>
          {resolveVerifyLabel(isVerifyingOtp, mode)}
        </button>
        <button
          type="button"
          className="auth-secondary-button"
          onClick={onResend}
          disabled={resendSeconds > 0 || isBusy || isSendingOtp}
        >
          {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
        </button>
      </div>
    </form>
  );
}

export default OtpVerifyStep;
