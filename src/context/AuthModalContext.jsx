import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useUserAuth } from "./UserAuthContext";
import AuthModal from "../components/auth/AuthModal";

const AuthModalContext = createContext(null);

const DEFAULT_STATE = {
  isOpen: false,
  view: "login",
  reason: "",
};

/**
 * The single owner of "we need the customer to be signed in right now".
 *
 * Replaces the old redirect-to-/login flow with an on-demand modal (the
 * Flipkart pattern): the customer keeps the page they were on, the modal
 * floats over it, and the action they were mid-way through resumes the moment
 * they authenticate. Nothing about browsing is interrupted until an action
 * genuinely requires an identity.
 *
 * The core API is promise-based so a trigger reads as a straight line:
 *
 *   const signedIn = await openAuth({ reason: "Sign in to check out" });
 *   if (signedIn) proceedToCheckout();
 *
 * `openAuth` resolves `true` on a successful sign-in and `false` if the
 * customer dismisses the modal. If they are already signed in it resolves
 * `true` immediately without ever showing the modal, so callers never have to
 * special-case that themselves.
 */
function AuthModalProvider({ children }) {
  const { isAuthenticated } = useUserAuth();
  const [state, setState] = useState(DEFAULT_STATE);

  // Holds the resolver of the promise handed to the current caller, so a
  // sign-in or a dismiss deep inside the modal can settle the exact call that
  // opened it. A ref (not state) because settling it must not depend on a
  // re-render having flushed.
  const resolverRef = useRef(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const settle = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (resolve) {
      resolve(result);
    }
  }, []);

  const openAuth = useCallback(
    ({ view = "login", reason = "" } = {}) => {
      // Already signed in: the requirement is already met. Resolve straight
      // away so callers can `if (await openAuth())` unconditionally.
      if (isAuthenticatedRef.current) {
        return Promise.resolve(true);
      }

      // A second openAuth while one is pending replaces the reason/view but
      // reuses the same promise contract — settle the previous caller as a
      // dismiss so its promise never dangles.
      settle(false);

      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setState({ isOpen: true, view, reason });
      });
    },
    [settle],
  );

  /** Dismissal — scrim click, close button, Esc. Resolves the caller `false`. */
  const closeAuth = useCallback(() => {
    setState((current) => ({ ...current, isOpen: false }));
    settle(false);
  }, [settle]);

  /** Called by the embedded cards once Firebase confirms the identity. */
  const handleAuthenticated = useCallback(() => {
    setState((current) => ({ ...current, isOpen: false }));
    settle(true);
  }, [settle]);

  const switchView = useCallback((view) => {
    setState((current) => ({ ...current, view }));
  }, []);

  const value = useMemo(
    () => ({
      isOpen: state.isOpen,
      view: state.view,
      reason: state.reason,
      openAuth,
      closeAuth,
      switchView,
    }),
    [state.isOpen, state.view, state.reason, openAuth, closeAuth, switchView],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={state.isOpen}
        view={state.view}
        reason={state.reason}
        onClose={closeAuth}
        onSwitchView={switchView}
        onAuthenticated={handleAuthenticated}
      />
    </AuthModalContext.Provider>
  );
}

const useAuthModal = () => {
  const context = useContext(AuthModalContext);

  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }

  return context;
};

export { AuthModalProvider, useAuthModal };
