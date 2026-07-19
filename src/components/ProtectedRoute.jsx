import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useUserAuth();

  const navigationState = useMemo(
    () => ({ from: `${location.pathname}${location.search}` }),
    [location.pathname, location.search],
  );

  // Session restoration is asynchronous, so this gate is what stops a
  // protected page flashing its signed-out state (or bouncing to /login) for
  // a customer who is in fact still signed in. It renders a neutral skeleton
  // rather than words: on a fast connection this is one or two frames, and a
  // sentence that appears and vanishes reads as a glitch.
  //
  // "Checking your Firebase session" also told the customer which vendor we
  // buy auth from, which is our problem, not theirs.
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={navigationState} />;
  }

  return children;
}

export default ProtectedRoute;
