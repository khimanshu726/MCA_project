import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { requiresEmailVerification } from "../utils/emailVerification";
import EmailVerificationGate from "./auth/EmailVerificationGate";

/**
 * Gates a route on an authenticated customer — now via the auth modal rather
 * than a redirect to /login.
 *
 * The difference matters for the customer: a guest who taps "Orders" keeps the
 * page they were on, signs in over it, and lands on Orders. There is no
 * bounce to a separate page and no lost context. If they dismiss the modal
 * without signing in, there is nothing protected to show, so they go Home.
 *
 * `reason` is the line shown at the top of the modal, so each gate can say why
 * it needs an identity ("Sign in to view your orders") instead of a generic
 * prompt.
 */
function ProtectedRoute({ children, reason = "Sign in to continue", requireVerified = true }) {
  const { isAuthenticated, isLoading, authUser, refreshProfile } = useUserAuth();
  const { openAuth } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    // Session restoration is asynchronous; don't prompt until we actually know
    // the customer is signed out, or the modal would flash for someone who is
    // in fact still signed in.
    if (isLoading || isAuthenticated) {
      return undefined;
    }

    let active = true;
    openAuth({ reason }).then((signedIn) => {
      if (active && !signedIn) {
        navigate("/", { replace: true });
      }
    });

    return () => {
      active = false;
    };
  }, [isLoading, isAuthenticated, openAuth, navigate, reason]);

  // While the session is being restored, hold a neutral skeleton rather than
  // words — on a fast connection this is one or two frames, and a sentence that
  // appears and vanishes reads as a glitch.
  if (isLoading) {
    return (
      <main className="page-stack" aria-busy="true" aria-live="polite">
        <span className="sr-only">Restoring your session</span>
        <section className="section-panel">
          <div className="flex flex-col gap-4">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-ink-100" />
            <div className="h-4 w-72 animate-pulse rounded bg-ink-100" />
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="h-28 animate-pulse rounded-2xl bg-ink-100" />
              <div className="h-28 animate-pulse rounded-2xl bg-ink-100" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Signed out: the auth modal (opened by the effect) floats over this. Behind
  // it we show a neutral, non-sensitive prompt rather than the protected
  // content — never the real page for someone who hasn't proven who they are.
  if (!isAuthenticated) {
    return (
      <main className="page-stack" aria-live="polite">
        <section className="section-panel text-center">
          <h1 className="text-xl font-semibold text-ink-900">Sign in to continue</h1>
          <p className="mt-2 text-sm text-ink-500">
            This page is only available to signed-in customers.
          </p>
        </section>
      </main>
    );
  }

  // Signed in, but an email/password account that hasn't verified its address.
  // These routes are the sensitive ones (checkout, account, orders, wishlist,
  // addresses, designs), so we hold them behind a self-service verify gate.
  // The server enforces the same rule on order placement (requireVerifiedEmail)
  // — this is the UX half of a two-sided gate, not the whole gate.
  if (requireVerified && requiresEmailVerification(authUser)) {
    return <EmailVerificationGate authUser={authUser} refreshProfile={refreshProfile} />;
  }

  return children;
}

export default ProtectedRoute;
