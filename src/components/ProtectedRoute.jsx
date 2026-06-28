import { Navigate, useLocation } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useUserAuth();

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
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
}

export default ProtectedRoute;
