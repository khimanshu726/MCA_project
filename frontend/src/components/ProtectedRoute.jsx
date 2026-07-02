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

  if (isLoading) {
    return (
      <main className="page-stack">
        <section className="section-panel">
          <div className="section-heading">
            <p className="eyebrow">Authenticating</p>
            <h2>Checking your Firebase session.</h2>
            <p className="section-copy">Please wait while we restore your account securely.</p>
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
