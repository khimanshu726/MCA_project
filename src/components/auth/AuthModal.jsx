import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import CustomerLoginCard from "../CustomerLoginCard";
import CustomerRegisterCard from "../CustomerRegisterCard";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const COPY = {
  login: {
    title: "Sign in to continue",
    subtitle: "Use your email, Google, or mobile OTP.",
    switchPrompt: "New to Elite Impressions?",
    switchAction: "Create an account",
  },
  register: {
    title: "Create your account",
    subtitle: "One account for orders, saved designs, and faster checkout.",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
  },
};

/**
 * The on-demand authentication modal (the Flipkart pattern).
 *
 * It reuses the exact same CustomerLoginCard / CustomerRegisterCard the
 * dedicated /login and /register pages render, so there is one auth surface to
 * maintain, not two that drift. The only difference is the cards are handed an
 * `onAuthenticated` callback instead of navigating — the modal closes and the
 * action the customer was mid-way through resumes.
 *
 * Accessibility is not optional here because the modal interrupts a task:
 * focus is trapped inside it, Escape and a scrim click dismiss it, the page
 * behind it cannot scroll, and focus returns to wherever it was when the modal
 * opened.
 */
function AuthModal({ isOpen, view, reason, onClose, onSwitchView, onAuthenticated }) {
  const panelRef = useRef(null);
  // Where focus was when we opened, so it can be handed back on close — a
  // keyboard user who triggered this from the "Wishlist" button lands back on
  // that button, not at the top of the document.
  const returnFocusRef = useRef(null);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap the tab ring so focus can never escape the panel while it is open.
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    returnFocusRef.current = document.activeElement;

    // Lock the background scroll. Stored so we restore whatever it was rather
    // than assuming it was scrollable.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the panel on the next frame, once it has rendered.
    const focusTimer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      } else {
        panelRef.current?.focus();
      }
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      // Restore focus to the trigger element if it is still in the document.
      const target = returnFocusRef.current;
      if (target && typeof target.focus === "function" && document.contains(target)) {
        target.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const copy = COPY[view] || COPY.login;
  const otherView = view === "login" ? "register" : "login";

  return createPortal(
    <div
      className="auth-modal-scrim"
      role="presentation"
      onMouseDown={(event) => {
        // Dismiss only on a click that both starts and ends on the scrim, so a
        // drag that began on an input and released outside doesn't close it.
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="auth-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-subtitle"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="auth-modal-header">
          <div className="auth-modal-heading">
            <span className="auth-modal-brand">Elite Impressions</span>
            <h2 id="auth-modal-title" className="auth-modal-title">
              {reason || copy.title}
            </h2>
            <p id="auth-modal-subtitle" className="auth-modal-subtitle">
              {copy.subtitle}
            </p>
          </div>
          <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close sign-in">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="auth-modal-tabs" role="tablist" aria-label="Authentication">
          <button
            type="button"
            role="tab"
            aria-selected={view === "login"}
            className={`auth-modal-tab ${view === "login" ? "is-active" : ""}`}
            onClick={() => onSwitchView("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "register"}
            className={`auth-modal-tab ${view === "register" ? "is-active" : ""}`}
            onClick={() => onSwitchView("register")}
          >
            Register
          </button>
        </div>

        <div className="auth-modal-body">
          {view === "login" ? (
            <CustomerLoginCard onAuthenticated={onAuthenticated} />
          ) : (
            <CustomerRegisterCard onAuthenticated={onAuthenticated} />
          )}

          <p className="auth-modal-switch">
            {copy.switchPrompt}{" "}
            <button type="button" className="auth-text-button" onClick={() => onSwitchView(otherView)}>
              {copy.switchAction}
            </button>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default AuthModal;
