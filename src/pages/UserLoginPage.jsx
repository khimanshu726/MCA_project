import { Link, Navigate, useLocation } from "react-router-dom";
import AuthSplitShell from "../components/AuthSplitShell";
import CustomerLoginCard from "../components/CustomerLoginCard";
import { useUserAuth } from "../context/UserAuthContext";

function UserLoginPage() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useUserAuth();
  const destination = location.state?.from || "/account";

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
