import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onIdTokenChanged, signInWithPhoneNumber, signOut as firebaseSignOut } from "firebase/auth";
import { fetchCustomerProfile } from "../lib/api";
import { ensureFirebaseAuth, ensureFirebasePersistence, firebaseAuth } from "../lib/firebase";
import { loadCustomerProfile, mapFirebaseUserFallback } from "../hooks/useCustomerProfile";

const UserAuthContext = createContext(null);

function UserAuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let unsubscribe = () => undefined;

    const handleAuthChange = async (nextUser) => {
      if (!isActive) return;

      if (!nextUser) {
        setAuthUser(null);
        setUser(null);
        setToken("");
        setIsLoading(false);
        return;
      }

      setAuthUser(nextUser);
      try {
        const { user: profileUser, token: profileToken } = await loadCustomerProfile(nextUser);
        if (!isActive) return;
        setUser(profileUser);
        setToken(profileToken);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    const setupAuth = async () => {
      try {
        const auth = await ensureFirebasePersistence();
        unsubscribe = onIdTokenChanged(auth, handleAuthChange);
      } catch {
        if (isActive) setIsLoading(false);
      }
    };

    setupAuth();

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const auth = ensureFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setUser(null);
      setToken("");
      return null;
    }

    const nextToken = await currentUser.getIdToken(true);
    setToken(nextToken);
    let resolvedUser = mapFirebaseUserFallback(currentUser);

    try {
      const response = await fetchCustomerProfile(nextToken);
      resolvedUser = response.user || resolvedUser;
    } catch {
      resolvedUser = mapFirebaseUserFallback(currentUser);
    }

    setUser(resolvedUser);
    return resolvedUser;
  }, []);

  const signInWithPhoneOtp = useCallback(async (phoneNumber, verifier) => {
    const auth = ensureFirebaseAuth();
    return signInWithPhoneNumber(auth, phoneNumber, verifier);
  }, []);

  const signOut = useCallback(async () => {
    const auth = ensureFirebaseAuth();
    await firebaseSignOut(auth);
    setAuthUser(null);
    setUser(null);
    setToken("");
  }, []);

  const value = useMemo(
    () => ({
      auth: firebaseAuth,
      authUser,
      token,
      user,
      isAuthenticated: Boolean(authUser),
      isLoading,
      refreshProfile,
      signInWithPhoneOtp,
      signOut,
    }),
    [authUser, isLoading, refreshProfile, signInWithPhoneOtp, signOut, token, user],
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
