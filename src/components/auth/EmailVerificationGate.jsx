import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { resendCurrentUserVerificationEmail, syncCustomerUserDocument } from "../../services/customerAuthService";
import { getFirebaseAuthErrorMessage } from "../../utils/firebaseAuthErrors";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * The blocking counterpart to EmailVerificationBanner.
 *
 * The banner is a soft nudge shown alongside content; this is a hard gate that
 * REPLACES the protected content until the address is verified. It has to be
 * self-service — the customer is standing in front of a wall, so the two ways
 * through it (resend the link, then re-check once they've clicked it) live
 * right here rather than sending them somewhere else to find them.
 */
function EmailVerificationGate({ authUser, refreshProfile }) {
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
      setCooldownSeconds((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [cooldownSeconds]);

  const handleResend = async () => {
    if (cooldownSeconds > 0) return;
    setError("");
    setMessage("");
    setIsResending(true);
    try {
      await resendCurrentUserVerificationEmail(authUser);
      setMessage("Verification email sent. Check your inbox — and your spam folder.");
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
      // Firebase only learns the address is verified on a reload of the user —
      // clicking the link in the email doesn't push anything to this tab.
      await authUser.reload();
      await syncCustomerUserDocument(authUser, { provider: "email" });
      await refreshProfile();
      if (!authUser.emailVerified) {
        setMessage("Not verified yet. Click the link in the email, then check again.");
      }
    } catch (submitError) {
      setError(getFirebaseAuthErrorMessage(submitError));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main className="page-stack" aria-live="polite">
      <section className="section-panel mx-auto max-w-lg text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MailCheck size={26} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink-900">Verify your email to continue</h1>
        <p className="mt-2 text-sm text-ink-600">
          We sent a verification link to <strong>{authUser?.email}</strong>. Confirm it to place orders and
          manage your account. It only takes a moment.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            className="auth-submit-button sm:w-auto sm:px-6"
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Checking..." : "I've verified — continue"}
          </button>
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
                : "Resend verification email"}
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="field-error auth-error mt-4">{error}</p> : null}
      </section>
    </main>
  );
}

export default EmailVerificationGate;
