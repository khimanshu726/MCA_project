import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onIdTokenChanged, signInWithPhoneNumber, signOut as firebaseSignOut } from "firebase/auth";
import { fetchCustomerProfile } from "../lib/api";
import { ensureFirebaseAuth, ensureFirebasePersistence, firebaseAuth } from "../lib/firebase";

const UserAuthContext = createContext(null);

const mapFirebaseUserFallback = (user) => {
  if (!user) {
    return null;
  }

  const primaryProviderId = user.providerData?.[0]?.providerId || user.providerId || "";
  const provider =
    primaryProviderId === "google.com"
      ? "google"
      : primaryProviderId === "facebook.com"
        ? "facebook"
        : primaryProviderId === "phone"
          ? "mobile"
          : "firebase";

  return {
    id: user.uid,
    email: user.email || "",
    mobile: user.phoneNumber ? user.phoneNumber.replace(/^\+91/, "") : "",
    provider,
    profileImage: user.photoURL || "",
    role: "customer",
    createdAt: user.metadata?.creationTime || "",
  };
};

function UserAuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let unsubscribe = () => undefined;

    const setupAuth = async () => {
      try {
        const auth = await ensureFirebasePersistence();

        unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
          if (!isActive) {
            return;
          }

          if (!nextUser) {
            setAuthUser(null);
            setUser(null);
            setToken("");
            setIsLoading(false);
            return;
          }

          setAuthUser(nextUser);

          try {
            const nextToken = await nextUser.getIdToken();
            setToken(nextToken);
            setUser(mapFirebaseUserFallback(nextUser));

            const profileResponse = await fetchCustomerProfile(nextToken);
            if (!isActive) {
              return;
            }

            setUser(profileResponse.user || mapFirebaseUserFallback(nextUser));
          } catch {
            if (!isActive) {
              return;
            }

            setUser(mapFirebaseUserFallback(nextUser));
          } finally {
            if (isActive) {
              setIsLoading(false);
            }
          }
        });
      } catch {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const auth = ensureFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setUser(null);
      setToken("");
      return null;
    }

    const nextToken = await currentUser.getIdToken(true);
    setToken(nextToken);
    const response = await fetchCustomerProfile(nextToken);
    setUser(response.user || mapFirebaseUserFallback(currentUser));
    return response.user || mapFirebaseUserFallback(currentUser);
  };

  const signInWithPhoneOtp = async (phoneNumber, verifier) => {
    const auth = ensureFirebaseAuth();
    return signInWithPhoneNumber(auth, phoneNumber, verifier);
  };

  const signOut = async () => {
    const auth = ensureFirebaseAuth();
    await firebaseSignOut(auth);
    setAuthUser(null);
    setUser(null);
    setToken("");
  };

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
    [authUser, isLoading, token, user],
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
