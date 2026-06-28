import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import AuthProviderButtons from "./AuthProviderButtons";
import PhoneOtpForm from "./PhoneOtpForm";
import { facebookProvider, googleProvider, isFirebaseConfigured } from "../lib/firebase";
import { getFirebaseAuthErrorMessage } from "../utils/firebaseAuthErrors";
import { useUserAuth } from "../context/UserAuthContext";

function CustomerAuthCard({ mode = "login", destination = "/account" }) {
  const navigate = useNavigate();
  const { auth, isLoading, signInWithPhoneOtp } = useUserAuth();
  const [isProviderBusy, setIsProviderBusy] = useState(false);
  const [error, setError] = useState("");
  const providersDisabled = !isFirebaseConfigured || isLoading || isProviderBusy;

  const handleProviderSignIn = async (provider) => {
    if (!isFirebaseConfigured) {
      setError("Firebase authentication is not configured yet.");
      return;
    }

    setError("");
    setIsProviderBusy(true);

    try {
      await signInWithPopup(auth, provider);
      navigate(destination, { replace: true });
    } catch (providerError) {
      setError(getFirebaseAuthErrorMessage(providerError));
    } finally {
      setIsProviderBusy(false);
    }
  };

  const handleSendOtp = async (phoneNumber, verifier) => signInWithPhoneOtp(phoneNumber, verifier);

  const handleVerifyOtp = async (confirmationResult, code) => {
    await confirmationResult.confirm(code);
    navigate(destination, { replace: true });
  };

  return (
    <div className="auth-card-stack">
      <AuthProviderButtons
        isBusy={providersDisabled}
        onGoogle={() => handleProviderSignIn(googleProvider)}
        onFacebook={() => handleProviderSignIn(facebookProvider)}
      />

      <PhoneOtpForm
        mode={mode}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        isBusy={isLoading || isProviderBusy}
        isConfigured={isFirebaseConfigured}
      />

      {error ? <p className="field-error auth-error">{error}</p> : null}

      {!isFirebaseConfigured ? (
        <div className="auth-config-warning">
          <p className="field-error auth-error">
            Firebase authentication is not configured yet. Add the required environment variables to enable Google,
            Facebook, and Phone login.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default CustomerAuthCard;
