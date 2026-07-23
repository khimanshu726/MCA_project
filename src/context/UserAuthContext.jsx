import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onIdTokenChanged, signInWithPhoneNumber, signOut as firebaseSignOut } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { fetchCustomerProfile, logoutCustomerSession } from "../lib/api";
import {
  ensureFirebaseAuth,
  ensureFirebasePersistence,
  firebaseAuth,
  getRememberMePreference,
  setRememberMePreference,
} from "../lib/firebase";
import {
  CUSTOMER_PROFILE_TIMEOUT_MS,
  loadCustomerProfile,
  mapFirebaseUserFallback,
} from "../hooks/useCustomerProfile";
import { registerAuthHandlers } from "../auth/authBridge";
import { broadcastSessionEnded, broadcastSignedIn, subscribeToSessionEvents } from "../auth/sessionChannel";
import { clearBuyNowSession } from "../utils/buyNowSession";
import { clearPendingDesign } from "../customizer/pendingDesign";
import {
  IDLE_TIMEOUT_MS,
  SESSION_ENDED,
  TOKEN_REFRESH_SKEW_MS,
  evaluateSession,
} from "../auth/sessionPolicy";

const UserAuthContext = createContext(null);

const SESSION_CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "focus"];

function UserAuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionEndedReason, setSessionEndedReason] = useState(null);
  const [rememberMe, setRememberMeState] = useState(true);
  const queryClient = useQueryClient();

  const lastActivityRef = useRef(Date.now());
  const authTimeRef = useRef(null);
  const isEndingSessionRef = useRef(false);

  const clearClientState = useCallback(() => {
    setAuthUser(null);
    setUser(null);
    setToken("");
    authTimeRef.current = null;

    queryClient.removeQueries({ queryKey: ["cart"] });
    queryClient.removeQueries({ queryKey: ["wishlist"] });
    queryClient.removeQueries({ queryKey: ["addresses"] });
    queryClient.removeQueries({ queryKey: ["orders"] });
    queryClient.removeQueries({ queryKey: ["designs"] });
    queryClient.removeQueries({ queryKey: ["customer"] });

    clearBuyNowSession();
    clearPendingDesign();
  }, [queryClient]);

  const endSession = useCallback(
    async (reason, { broadcast = true } = {}) => {
      if (isEndingSessionRef.current) return;
      isEndingSessionRef.current = true;

      try {
        const auth = ensureFirebaseAuth();
        await firebaseSignOut(auth);
      } catch {
        // Local cleanup still has to happen even if Firebase is already signed out.
      }

      clearClientState();

      if (reason && reason !== SESSION_ENDED.SIGNED_OUT) {
        setSessionEndedReason(reason);
      }

      if (broadcast) {
        broadcastSessionEnded(reason);
      }

      isEndingSessionRef.current = false;
    },
    [clearClientState],
  );

  const hydrateProfileInBackground = useCallback((firebaseUser, fallbackUser, fallbackToken, isActiveRef) => {
    void loadCustomerProfile(firebaseUser, { timeoutMs: CUSTOMER_PROFILE_TIMEOUT_MS }).then(
      ({ user: profileUser, token: profileToken }) => {
        if (!isActiveRef()) return;
        if (firebaseAuth?.currentUser?.uid !== firebaseUser.uid) return;

        setUser(profileUser || fallbackUser);
        setToken(profileToken || fallbackToken || "");
      },
    );
  }, []);
  const primeAuthenticatedSession = useCallback(async (firebaseUser) => {
    if (!firebaseUser) return null;

    const tokenResult = await firebaseUser.getIdTokenResult();
    const authTimeMs = new Date(tokenResult.authTime).getTime();
    authTimeRef.current = authTimeMs;

    const fallbackUser = mapFirebaseUserFallback(firebaseUser);
    const fallbackToken = tokenResult.token || (await firebaseUser.getIdToken());

    setAuthUser(firebaseUser);
    setToken(fallbackToken);
    setUser(fallbackUser);
    setSessionEndedReason(null);
    setIsLoading(false);

    hydrateProfileInBackground(firebaseUser, fallbackUser, fallbackToken, () => firebaseAuth?.currentUser?.uid === firebaseUser.uid);

    return fallbackUser;
  }, [hydrateProfileInBackground]);

  useEffect(() => {
    let isActive = true;
    let unsubscribe = () => undefined;

    const handleAuthChange = async (nextUser) => {
      if (!isActive) return;

      if (!nextUser) {
        setAuthUser(null);
        setUser(null);
        setToken("");
        authTimeRef.current = null;
        setIsLoading(false);
        return;
      }

      setAuthUser(nextUser);

      try {
        const tokenResult = await nextUser.getIdTokenResult();
        if (!isActive) return;

        const authTimeMs = new Date(tokenResult.authTime).getTime();
        authTimeRef.current = authTimeMs;

        const verdict = evaluateSession({
          authTimeMs,
          lastActivityMs: lastActivityRef.current,
          rememberMe: getRememberMePreference(),
        });

        if (!verdict.valid) {
          setIsLoading(false);
          await endSession(verdict.reason);
          return;
        }

        const fallbackUser = mapFirebaseUserFallback(nextUser);
        const fallbackToken = tokenResult.token || (await nextUser.getIdToken());

        setToken(fallbackToken);
        setUser(fallbackUser);
        setSessionEndedReason(null);
        setIsLoading(false);

        hydrateProfileInBackground(nextUser, fallbackUser, fallbackToken, () => isActive);
      } catch {
        if (isActive) {
          setUser(mapFirebaseUserFallback(nextUser));
          setIsLoading(false);
        }
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
  }, [endSession, hydrateProfileInBackground]);

  useEffect(() => {
    return registerAuthHandlers({
      getFreshToken: async () => {
        const auth = ensureFirebaseAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return null;

        const fresh = await currentUser.getIdToken(true);
        setToken(fresh);
        return fresh;
      },
      onSessionEnded: (reason) => {
        endSession(reason || SESSION_ENDED.INVALID);
      },
    });
  }, [endSession]);

  useEffect(() => {
    return subscribeToSessionEvents({
      onSessionEnded: (reason) => {
        endSession(reason || SESSION_ENDED.SIGNED_OUT, { broadcast: false });
      },
      onSignedIn: () => {
        queryClient.invalidateQueries();
      },
    });
  }, [endSession, queryClient]);

  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    const handleVisibility = () => {
      if (document.visibilityState === "visible") markActive();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!authUser) return undefined;

    const interval = window.setInterval(async () => {
      const verdict = evaluateSession({
        authTimeMs: authTimeRef.current,
        lastActivityMs: lastActivityRef.current,
        rememberMe: getRememberMePreference(),
      });

      if (!verdict.valid) {
        await endSession(verdict.reason);
        return;
      }

      try {
        const auth = ensureFirebaseAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const result = await currentUser.getIdTokenResult();
        const expiresAt = new Date(result.expirationTime).getTime();

        if (expiresAt - Date.now() < TOKEN_REFRESH_SKEW_MS) {
          const fresh = await currentUser.getIdToken(true);
          setToken(fresh);
        }
      } catch {
        // Let the next authenticated request decide whether this was transient.
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [authUser, endSession]);

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
      const response = await fetchCustomerProfile(nextToken, CUSTOMER_PROFILE_TIMEOUT_MS);
      resolvedUser = response.user || resolvedUser;
    } catch {
      resolvedUser = mapFirebaseUserFallback(currentUser);
    }

    setUser(resolvedUser);
    return resolvedUser;
  }, []);

  const prepareSignIn = useCallback(async () => {
    setRememberMePreference(true);
    setRememberMeState(true);
    lastActivityRef.current = Date.now();
    setSessionEndedReason(null);
    return ensureFirebasePersistence();
  }, []);

  const completeSignIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSessionEndedReason(null);
    broadcastSignedIn();
  }, []);

  const signInWithPhoneOtp = useCallback(async (phoneNumber, verifier) => {
    const auth = ensureFirebaseAuth();
    return signInWithPhoneNumber(auth, phoneNumber, verifier);
  }, []);

  const signOut = useCallback(async () => {
    const currentToken = token;

    if (currentToken) {
      try {
        await logoutCustomerSession(currentToken);
      } catch {
        // Best-effort, as above.
      }
    }

    await endSession(SESSION_ENDED.SIGNED_OUT);
  }, [token, endSession]);

  const clearSessionEndedReason = useCallback(() => setSessionEndedReason(null), []);

  const value = useMemo(
    () => ({
      auth: firebaseAuth,
      authUser,
      token,
      user,
      isAuthenticated: Boolean(authUser),
      isLoading,
      sessionEndedReason,
      clearSessionEndedReason,
      rememberMe,
      prepareSignIn,
      completeSignIn,
      refreshProfile,
      primeAuthenticatedSession,
      signInWithPhoneOtp,
      signOut,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
    }),
    [
      authUser,
      isLoading,
      sessionEndedReason,
      clearSessionEndedReason,
      rememberMe,
      prepareSignIn,
      completeSignIn,
      refreshProfile,
      primeAuthenticatedSession,
      signInWithPhoneOtp,
      signOut,
      token,
      user,
    ],
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




