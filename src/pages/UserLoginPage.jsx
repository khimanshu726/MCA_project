import { Link, Navigate, useLocation } from "react-router-dom";
import AuthSplitShell from "../components/AuthSplitShell";
import CustomerAuthCard from "../components/CustomerAuthCard";
import { useUserAuth } from "../context/UserAuthContext";

function UserLoginPage() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useUserAuth();
  const destination = location.state?.from || "/account";

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/account" replace />;
  }

  return (
    <AuthSplitShell
      eyebrow="Welcome back!"
      title="Login to your account"
      subtitle="Use secure Firebase sign-in to continue with your saved cart, delivery details, and print-ready orders."
      promptText="Not registered?"
      promptLinkTo="/register"
      promptLinkLabel="Create an account"
    >
      <CustomerAuthCard mode="login" destination={destination} />
      <div className="auth-footer-links">
        <Link to="/register">Create new account</Link>
      </div>
    </AuthSplitShell>
  );
}

export default UserLoginPage;
