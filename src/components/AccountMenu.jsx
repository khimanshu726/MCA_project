import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Heart, LogOut, MapPin, Package, Palette, User } from "lucide-react";
import { useUserAuth } from "../context/UserAuthContext";
import { useAuthModal } from "../context/AuthModalContext";

// The signed-in flyout links. Icons come from lucide (already the header's
// icon set), so the menu reads as part of the same system.
const MENU_LINKS = [
  { to: "/account", label: "Your Account", icon: User },
  { to: "/account/orders", label: "Your Orders", icon: Package },
  { to: "/wishlist", label: "Your Wish List", icon: Heart },
  { to: "/account/designs", label: "Your Designs", icon: Palette },
  { to: "/account/addresses", label: "Your Addresses", icon: MapPin },
];

// A friendly first name for the greeting, degrading gracefully to the email
// local-part and finally "there" so the greeting is never blank.
const firstNameOf = (user) => {
  const source = user?.username || user?.displayName || user?.email?.split("@")[0] || "";
  const first = source.trim().split(/\s+/)[0];
  return first || "there";
};

/**
 * Amazon-style account control: a two-line "Hello, <name> / Account & Lists"
 * trigger that opens a flyout of account links. Opens on hover (desktop) and
 * on click/tap (touch + keyboard); closes on outside click, Escape, and route
 * change. Signed out, it invites the customer to sign in.
 */
function AccountMenu() {
  const { isAuthenticated, user, signOut } = useUserAuth();
  const { openAuth } = useAuthModal();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Any navigation dismisses the menu.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Outside click / Escape while open.
  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    signOut();
  };

  const handleSignIn = () => {
    setOpen(false);
    openAuth({ reason: "Sign in to your account" });
  };

  const greetingName = isAuthenticated ? firstNameOf(user) : "sign in";

  return (
    <div
      className="account-menu"
      data-open={open}
      ref={containerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="account-menu-trigger nav-link utility-link"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={isAuthenticated ? "Account and lists" : "Sign in to your account"}
        onClick={() => (isAuthenticated ? setOpen((value) => !value) : handleSignIn())}
      >
        <User size={18} strokeWidth={1.8} aria-hidden="true" className="account-menu-icon" />
        <span className="account-menu-labels">
          <span className="account-menu-greeting">Hello, {greetingName}</span>
          <span className="account-menu-title">
            Account &amp; Lists
            <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
          </span>
        </span>
      </button>

      {open ? (
        <div className="account-menu-panel" role="menu" aria-label="Account menu">
          {isAuthenticated ? (
            <>
              <p className="account-menu-heading">Your Account</p>
              <ul className="account-menu-list">
                {MENU_LINKS.map(({ to, label, icon: Icon }) => (
                  <li key={to} role="none">
                    <Link to={to} role="menuitem" className="account-menu-item" onClick={() => setOpen(false)}>
                      <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="account-menu-divider" />
              <button
                type="button"
                className="account-menu-item account-menu-signout"
                role="menuitem"
                onClick={handleSignOut}
              >
                <LogOut size={16} strokeWidth={1.7} aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="account-menu-guest">
              <button type="button" className="primary-button account-menu-signin" onClick={handleSignIn}>
                Sign in
              </button>
              <p className="account-menu-guest-note">
                New customer?{" "}
                <button type="button" className="account-menu-link" onClick={handleSignIn}>
                  Start here
                </button>
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default AccountMenu;
