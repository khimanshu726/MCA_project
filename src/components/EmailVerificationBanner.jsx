import { useEffect, useState } from "react";
import { resendCurrentUserVerificationEmail, syncCustomerUserDocument } from "../services/customerAuthService";
import { getFirebaseAuthErrorMessage } from "../utils/firebaseAuthErrors";

const RESEND_COOLDOWN_SECONDS = 60;

function EmailVerificationBanner({ authUser, refreshProfile }) {
  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCooldownSeconds((currentValue) => Math.max(currentValue - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [cooldownSeconds]);

  const needsVerification =
    Boolean(authUser?.email) &&
    Boolean(authUser?.providerData?.some((provider) => provider.providerId === "password")) &&
    !authUser?.emailVerified;

  if (!needsVerification) {
    return null;
  }

  const handleResend = async () => {
    if (cooldownSeconds > 0) {
      return;
    }

    setError("");
    setMessage("");
    setIsResending(true);

    try {
      await resendCurrentUserVerificationEmail(authUser);
      setMessage("Verification email sent. Please check your inbox.");
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (submitError) {
      setError(getFirebaseAuthErrorMessage(submitError));
    } finally {
      setIsResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setError("");
    setMessage("");
    setIsRefreshing(true);

    try {
      await authUser.reload();
      await syncCustomerUserDocument(authUser, { provider: "email" });
      await refreshProfile();
      setMessage(authUser.emailVerified ? "Email verification confirmed." : "Your email is not verified yet.");
    } catch (submitError) {
      setError(getFirebaseAuthErrorMessage(submitError));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section className="auth-verification-banner" aria-live="polite">
      <div className="auth-verification-copy">
        <strong>Please verify your email before accessing all features.</strong>
        <span>
          We sent a verification message to <strong>{authUser.email}</strong>.
        </span>
      </div>

      <div className="auth-verification-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={handleResend}
          disabled={isResending || cooldownSeconds > 0}
        >
          {isResending
            ? "Sending..."
            : cooldownSeconds > 0
              ? `Resend in ${cooldownSeconds}s`
              : "Resend Verification"}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={handleRefreshStatus}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh status"}
        </button>
      </div>

      {message ? <p className="auth-inline-helper auth-info">{message}</p> : null}
      {error ? <p className="field-error auth-error">{error}</p> : null}
    </section>
  );
}

export default EmailVerificationBanner;
