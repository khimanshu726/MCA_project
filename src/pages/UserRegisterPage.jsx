import { Link, Navigate } from "react-router-dom";
import AuthSplitShell from "../components/AuthSplitShell";
import CustomerAuthCard from "../components/CustomerAuthCard";
import { useUserAuth } from "../context/UserAuthContext";

function UserRegisterPage() {
  const { isAuthenticated, isLoading } = useUserAuth();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/account" replace />;
  }

  return (
    <AuthSplitShell
      eyebrow="Create your account"
      title="Start ordering with Elite Empressions"
      subtitle="Create your customer account with secure Google, Facebook, or real phone OTP sign-in."
      promptText="Already registered?"
      promptLinkTo="/login"
      promptLinkLabel="Login"
      leftHeadline="Everything you need for custom print ordering in one account."
      leftCaption="Sign up to browse print products, save delivery details, and place personalized orders without starting from scratch every time."
      highlights={[
        "Register with your email address or mobile number.",
        "Save account details for repeat print orders and faster checkout.",
        "Access custom products, uploads, and order-ready delivery flow anytime.",
      ]}
    >
      <CustomerAuthCard mode="register" destination="/account" />
      <div className="auth-footer-links">
        <Link to="/login">Already have an account?</Link>
      </div>
    </AuthSplitShell>
  );
}

export default UserRegisterPage;
