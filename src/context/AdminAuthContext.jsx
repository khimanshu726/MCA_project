import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchAdminProfile, loginAdmin, registerAdmin, sendLoginOtp, verifyLoginOtp } from "../lib/api";

const ADMIN_SESSION_KEY = "elite-admin-session";
const AdminAuthContext = createContext(null);

const loadSession = () => {
  if (typeof window === "undefined") {
    return { token: "", admin: null };
  }

  try {
    const rawValue = window.localStorage.getItem(ADMIN_SESSION_KEY);

    if (!rawValue) {
      return { token: "", admin: null };
    }

    const parsedValue = JSON.parse(rawValue);
    return {
      token: parsedValue.token || "",
      admin: parsedValue.admin || null,
    };
  } catch {
    return { token: "", admin: null };
  }
};

function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  }, [session]);

  const applySession = (token, admin) => {
    setSession({
      token,
      admin,
    });
  };

  const signInWithPassword = async (identifier, password) => {
    const response = await loginAdmin({ identifier, password });
    applySession(response.token, response.user);
    return response.user;
  };

  const registerWithEmail = async (identifier, password) => {
    const response = await registerAdmin({ identifier, password });
    applySession(response.token, response.user);
    return response.user;
  };

  const requestOtp = async (mobile) => sendLoginOtp({ mobile });

  const completeOtpAuth = async (mobile, otp) => {
    const response = await verifyLoginOtp({ mobile, otp });
    applySession(response.token, response.user);
    return response.user;
  };

  const completeExternalSignIn = async (token) => {
    const response = await fetchAdminProfile(token);
    applySession(token, response.user);
    return response.user;
  };

  const refreshProfile = async () => {
    if (!session.token) {
      return null;
    }

    const response = await fetchAdminProfile(session.token);
    setSession((currentSession) => ({
      ...currentSession,
      admin: response.user,
    }));

    return response.user;
  };

  const signOut = () => {
    setSession({
      token: "",
      admin: null,
    });
  };

  const value = useMemo(
    () => ({
      token: session.token,
      admin: session.admin,
      isAuthenticated: Boolean(session.token),
      signInWithPassword,
      registerWithEmail,
      requestOtp,
      completeOtpAuth,
      completeExternalSignIn,
      refreshProfile,
      signOut,
    }),
    [session.admin, session.token],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }

  return context;
};

export { AdminAuthProvider, useAdminAuth };
