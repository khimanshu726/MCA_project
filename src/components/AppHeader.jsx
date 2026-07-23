import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, User, LogOut, Menu, X, Heart } from "lucide-react";
import { categoryMenu, navigationLinks } from "../data";
import SearchAutocomplete from "./SearchAutocomplete";
import { useAuthModal } from "../context/AuthModalContext";

function BrandBlock() {
  return (
    <Link to="/" className="brand-block" aria-label="Elite Empressions home">
      <h1>Elite Empressions</h1>
    </Link>
  );
}

function AccountActions({ isAuthenticated, cartCount, wishlistCount, onSignOut, mobileOpen, onToggleMobile }) {
  const { openAuth } = useAuthModal();
  const navigate = useNavigate();

  // Signed out: open the modal in place rather than routing to /login, and go
  // to the account hub once they're in. The /login page still exists as a
  // deep-link target; this is just the primary, non-interrupting entry point.
  const handleSignIn = async () => {
    const signedIn = await openAuth({ reason: "Sign in to your account" });
    if (signedIn) {
      navigate("/account");
    }
  };

  return (
    <div className="account-actions">
      {isAuthenticated ? (
        <NavLink
          to="/account"
          className={({ isActive }) => `nav-link utility-link ${isActive ? "active" : ""}`}
          aria-label="My account"
        >
          <User size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className="hide-mobile">Account</span>
        </NavLink>
      ) : (
        <button
          type="button"
          className="nav-link nav-button utility-link"
          onClick={handleSignIn}
          aria-label="Log in"
        >
          <User size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className="hide-mobile">Login</span>
        </button>
      )}
      <NavLink
        to="/wishlist"
        className={({ isActive }) => `nav-link utility-link ${isActive ? "active" : ""}`}
        aria-label={`Wishlist with ${wishlistCount} items`}
      >
        <Heart size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="hide-mobile">Wishlist</span>
        {wishlistCount > 0 ? <span className="nav-count">{wishlistCount}</span> : null}
      </NavLink>
      <NavLink
        to="/cart"
        className={({ isActive }) => `nav-link utility-link ${isActive ? "active" : ""}`}
        aria-label={`Cart with ${cartCount} items`}
      >
        <ShoppingBag size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="hide-mobile">Cart</span>
        <span className="nav-count">{cartCount}</span>
      </NavLink>
      {isAuthenticated ? (
        <button
          type="button"
          className="nav-link nav-button utility-link hide-mobile"
          onClick={onSignOut}
          aria-label="Log out"
        >
          <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        className="nav-link nav-button utility-link show-mobile"
        onClick={onToggleMobile}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
      </button>
    </div>
  );
}

function PrimaryNav() {
  return (
    <nav className="site-nav" aria-label="Primary navigation">
      {navigationLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

function CategoryNav() {
  return (
    <nav className="category-nav" aria-label="Category shortcuts">
      {categoryMenu.map((item) => (
        <Link
          key={item.label}
          className="category-link"
          to={`/products?category=${encodeURIComponent(item.category)}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function AppHeader({
  isScrolled,
  searchTerm,
  onSearchTermChange,
  onSearchSubmit,
  isAuthenticated,
  cartCount,
  wishlistCount,
  onSignOut,
  mobileOpen,
  onToggleMobile,
}) {
  return (
    <header className={`site-header ${isScrolled ? "is-scrolled" : ""}`}>
      <div className="header-main-row">
        <BrandBlock />

        <SearchAutocomplete
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
          onSubmit={onSearchSubmit}
        />

        <AccountActions
          isAuthenticated={isAuthenticated}
          cartCount={cartCount}
          wishlistCount={wishlistCount}
          onSignOut={onSignOut}
          mobileOpen={mobileOpen}
          onToggleMobile={onToggleMobile}
        />
      </div>

      <div className={`header-nav-row ${mobileOpen ? "is-open" : ""}`}>
        <PrimaryNav />
        <CategoryNav />
      </div>
    </header>
  );
}

export default AppHeader;
