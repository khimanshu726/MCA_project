import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchCustomerProfile, loginCustomer, registerCustomer } from "../lib/api";

const CUSTOMER_SESSION_KEY = "elite-customer-session";
const UserAuthContext = createContext(null);

const loadSession = () => {
  if (typeof window === "undefined") {
    return { token: "", user: null };
  }

  try {
    const rawValue = window.localStorage.getItem(CUSTOMER_SESSION_KEY);

    if (!rawValue) {
      return { token: "", user: null };
    }

    const parsedValue = JSON.parse(rawValue);
    return {
      token: parsedValue.token || "",
      user: parsedValue.user || null,
    };
  } catch {
    return { token: "", user: null };
  }
};

function UserAuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  useEffect(() => {
    window.localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
  }, [session]);

  const applySession = (token, user) => {
    setSession({
      token,
      user,
    });
  };

  const signIn = async (identifier, password) => {
    const response = await loginCustomer({ identifier, password });
    applySession(response.token, response.user);
    return response.user;
  };

  const signUp = async (identifier, password) => {
    const response = await registerCustomer({ identifier, password });
    applySession(response.token, response.user);
    return response.user;
  };

  const refreshProfile = async () => {
    if (!session.token) {
      return null;
    }

    const response = await fetchCustomerProfile(session.token);
    setSession((currentSession) => ({
      ...currentSession,
      user: response.user,
    }));

    return response.user;
  };

  const signOut = () => {
    setSession({
      token: "",
      user: null,
    });
  };

  const value = useMemo(
    () => ({
      token: session.token,
      user: session.user,
      isAuthenticated: Boolean(session.token),
      signIn,
      signUp,
      refreshProfile,
      signOut,
    }),
    [session.token, session.user],
  );

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

const useUserAuth = () => {
  const context = useContext(UserAuthContext);

  if (!context) {
    throw new Error("useUserAuth must be used within a UserAuthProvider");
  }

  return context;
};

export { UserAuthProvider, useUserAuth };
