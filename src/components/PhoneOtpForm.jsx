import OtpVerifyStep from "./OtpVerifyStep";
import PhoneEntryStep from "./PhoneEntryStep";
import { usePhoneOtpFlow } from "../hooks/usePhoneOtpFlow";

/**
 * Thin presentational shell that composes the phone entry + OTP verify steps.
 * All flow logic lives inside `usePhoneOtpFlow`.
 */
function PhoneOtpForm({
  mode = "login",
  onSendOtp,
  onVerifyOtp,
  isBusy = false,
  isConfigured = true,
}) {
  const recaptchaContainerId = `${mode}-phone-recaptcha`;

  const flow = usePhoneOtpFlow({
    recaptchaContainerId,
    onSendOtp,
    onVerifyOtp,
  });

  return (
    <div className="auth-phone-panel">
      <div className="auth-divider">
        <span>or use your mobile number</span>
      </div>

      <PhoneEntryStep
        mode={mode}
        mobile={flow.mobile}
        onMobileChange={flow.changeMobile}
        onSendOtp={flow.sendOtp}
        isSendingOtp={flow.isSendingOtp}
        isVerifyingOtp={flow.isVerifyingOtp}
        isOtpStep={flow.isOtpStep}
        isBusy={isBusy}
        isConfigured={isConfigured}
      />

      <div id={recaptchaContainerId} className="auth-recaptcha-slot" />

      {flow.isOtpStep ? (
        <OtpVerifyStep
          mode={mode}
          otpCode={flow.otpCode}
          onOtpChange={flow.changeOtp}
          onVerify={flow.verifyOtp}
          onResend={flow.resendOtp}
          resendSeconds={flow.resendSeconds}
          isVerifyingOtp={flow.isVerifyingOtp}
          isSendingOtp={flow.isSendingOtp}
          isBusy={isBusy}
          isConfigured={isConfigured}
        />
      ) : null}

      {flow.message ? (
        <p className="auth-inline-helper auth-info">{flow.message}</p>
      ) : null}
      {flow.error ? (
        <p className="field-error auth-error">{flow.error}</p>
      ) : null}

      {!isConfigured ? (
        <p className="field-error auth-error">
          Firebase environment variables are missing. Configure the app before using phone sign-in.
        </p>
      ) : null}
    </div>
  );
}

export default PhoneOtpForm;
