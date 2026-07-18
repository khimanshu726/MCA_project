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
import { loadCustomerProfile, mapFirebaseUserFallback } from "../hooks/useCustomerProfile";
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

/** How often the client re-checks its own session against the policy. */
const SESSION_CHECK_INTERVAL_MS = 60 * 1000;

/** Activity that counts as "the customer is still here". */
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "focus"];

function UserAuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionEndedReason, setSessionEndedReason] = useState(null);
  const [rememberMe, setRememberMeState] = useState(() => getRememberMePreference());
  const queryClient = useQueryClient();

  const lastActivityRef = useRef(Date.now());
  const authTimeRef = useRef(null);
  // Guards against two expiry paths (idle timer and a 401) racing to sign out
  // and firing two redirects / two toasts for one event.
  const isEndingSessionRef = useRef(false);

  /**
   * Wipes every trace of the previous customer from this tab.
   *
   * Ordering matters: React Query caches are cleared BEFORE state flips, so a
   * component re-rendering as signed-out can never paint the old customer's
   * cart or addresses in the gap. The checkout and Buy Now sessions go too —
   * a half-finished purchase belongs to the person who started it.
   */
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

  /**
   * Ends the session locally. Used for every involuntary ending — expiry,
   * idle, revocation, a 401 that survived a token refresh — and by the
   * explicit sign-out below once the server has been told.
   */
  const endSession = useCallback(
    async (reason, { broadcast = true } = {}) => {
      if (isEndingSessionRef.current) return;
      isEndingSessionRef.current = true;

      try {
        const auth = ensureFirebaseAuth();
        await firebaseSignOut(auth);
      } catch {
        // Already signed out, or Firebase unavailable. Clearing local state
        // still has to happen — leaving a customer looking signed in after
        // their session died is the failure mode this whole change exists to
        // remove.
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

  // Firebase is the source of truth for identity; this keeps React in step.
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
        // auth_time is when the customer actually proved who they are. It
        // survives token refreshes, which is exactly why the session age is
        // measured from it rather than from when this tab happened to open.
        const tokenResult = await nextUser.getIdTokenResult();
        if (!isActive) return;

        const authTimeMs = new Date(tokenResult.authTime).getTime();
        authTimeRef.current = authTimeMs;

        const verdict = evaluateSession({
          authTimeMs,
          lastActivityMs: lastActivityRef.current,
          rememberMe: getRememberMePreference(),
        });

        // A restored-but-stale session: the browser had a credential, but it
        // is older than policy allows. End it before any protected data is
        // fetched with it.
        if (!verdict.valid) {
          setIsLoading(false);
          await endSession(verdict.reason);
          return;
        }

        const { user: profileUser, token: profileToken } = await loadCustomerProfile(nextUser);
        if (!isActive) return;
        setUser(profileUser);
        setToken(profileToken);
        setSessionEndedReason(null);
      } catch {
        if (isActive) {
          setUser(mapFirebaseUserFallback(nextUser));
        }
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
  }, [endSession]);

  // Lets lib/api.js recover a stale token and report an unrecoverable 401
  // without every API function having to thread auth state through.
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

  // Another tab signed out, or signed in. Follow it, without echoing the
  // broadcast back and starting a loop.
  useEffect(() => {
    return subscribeToSessionEvents({
      onSessionEnded: (reason) => {
        endSession(reason || SESSION_ENDED.SIGNED_OUT, { broadcast: false });
      },
      onSignedIn: () => {
        // Firebase propagates the credential itself under local persistence;
        // this just makes sure server state for the new customer is refetched
        // rather than served from the previous one's cache.
        queryClient.invalidateQueries();
      },
    });
  }, [endSession, queryClient]);

  // Idle tracking. Cheap on purpose: a ref write per event, no re-render.
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

  // Periodic self-check: enforces max age and idle timeout, and refreshes the
  // ID token before it expires so in-flight requests never race it.
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
        // A refresh failure here is not fatal on its own — the next request
        // will retry via the bridge and end the session if it truly can't
        // recover. Tearing the session down on one transient network blip
        // would be worse than waiting.
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
      const response = await fetchCustomerProfile(nextToken);
      resolvedUser = response.user || resolvedUser;
    } catch {
      resolvedUser = mapFirebaseUserFallback(currentUser);
    }

    setUser(resolvedUser);
    return resolvedUser;
  }, []);

  /**
   * Applies the Remember Me choice and returns the auth instance to sign in
   * with. Must be awaited before the sign-in call — persistence governs
   * credentials stored after it is set, so setting it afterwards would leave
   * this session on the previous mode.
   */
  const prepareSignIn = useCallback(async (nextRememberMe = false) => {
    setRememberMePreference(nextRememberMe);
    setRememberMeState(nextRememberMe);
    lastActivityRef.current = Date.now();
    setSessionEndedReason(null);
    return ensureFirebasePersistence(nextRememberMe);
  }, []);

  /** Call after any successful sign-in so other tabs rehydrate. */
  const completeSignIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSessionEndedReason(null);
    broadcastSignedIn();
  }, []);

  const signInWithPhoneOtp = useCallback(async (phoneNumber, verifier) => {
    const auth = ensureFirebaseAuth();
    return signInWithPhoneNumber(auth, phoneNumber, verifier);
  }, []);

  /**
   * Explicit sign-out. Tells the server first so refresh tokens are revoked
   * for every device, then tears down locally.
   *
   * The server call is best-effort: if it fails, the local sign-out still
   * proceeds. A logout that refused to complete because the network blinked
   * would strand someone signed in on a shared computer, which is precisely
   * the case logout exists for.
   */
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
