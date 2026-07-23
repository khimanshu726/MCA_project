import { Link, Navigate, useLocation } from "react-router-dom";
import AuthSplitShell from "../components/AuthSplitShell";
import CustomerLoginCard from "../components/CustomerLoginCard";
import { useUserAuth } from "../context/UserAuthContext";

function UserLoginPage() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useUserAuth();
  // Default to Home after login, matching standard storefront behaviour. The
  // original destination is only honoured when a protected route sent the
  // customer here (ProtectedRoute sets location.state.from) — so a deliberate
  // "Login" from the header lands on Home, while an interrupted attempt to
  // reach /account, /wishlist, /checkout, etc. resumes there.
  const destination = location.state?.from || "/";

  if (!isLoading && isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  return (
    <AuthSplitShell
      eyebrow="Welcome back!"
      title="Login to your account"
      subtitle="Sign in to pick up your saved cart, delivery details, and print-ready orders."
      promptText="Not registered?"
      promptLinkTo="/register"
      promptLinkLabel="Create an account"
    >
      <CustomerLoginCard destination={destination} />
      <div className="auth-footer-links">
        <Link to="/register">Create new account</Link>
      </div>
    </AuthSplitShell>
  );
}

export default UserLoginPage;
