import { useMemo } from "react";
import { normalizeMobileInput } from "../utils/authDetection";
import InputField from "./InputField";

const OTP_LABELS = {
  sending: "Sending OTP...",
  resend: "Send OTP Again",
  send: "Send OTP",
};

const resolveSendLabel = (isSendingOtp, isOtpStep) => {
  if (isSendingOtp) return OTP_LABELS.sending;
  if (isOtpStep) return OTP_LABELS.resend;
  return OTP_LABELS.send;
};

function PhoneEntryStep({
  mode,
  mobile,
  onMobileChange,
  onSendOtp,
  isSendingOtp,
  isVerifyingOtp,
  isOtpStep,
  isBusy,
  isConfigured,
}) {
  const canSendOtp = useMemo(
    () =>
      isConfigured &&
      !isBusy &&
      !isSendingOtp &&
      normalizeMobileInput(mobile).length === 10,
    [isBusy, isConfigured, isSendingOtp, mobile],
  );

  return (
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
          onChange={onMobileChange}
          disabled={isBusy || isSendingOtp || isVerifyingOtp}
        />
      </InputField>

      <button
        type="button"
        className="auth-submit-button"
        onClick={onSendOtp}
        disabled={!canSendOtp}
      >
        {resolveSendLabel(isSendingOtp, isOtpStep)}
      </button>
    </div>
  );
}

export default PhoneEntryStep;
