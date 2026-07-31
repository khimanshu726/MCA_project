import { Link, NavLink } from "react-router-dom";
import { ShoppingBag, Menu, X, Heart } from "lucide-react";
import { categoryMenu, navigationLinks } from "../data";
import SearchAutocomplete from "./SearchAutocomplete";
import AccountMenu from "./AccountMenu";

function BrandBlock() {
  return (
    <Link to="/" className="brand-block" aria-label="Elite Impressions home">
      <h1>Elite Impressions</h1>
    </Link>
  );
}

function AccountActions({ cartCount, wishlistCount, mobileOpen, onToggleMobile }) {
  return (
    <div className="account-actions">
      {/* Amazon-style account flyout: greeting + a menu of account links, with
          Sign Out living inside the menu (no separate logout button). */}
      <AccountMenu />
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
  cartCount,
  wishlistCount,
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
          cartCount={cartCount}
          wishlistCount={wishlistCount}
          mobileOpen={mobileOpen}
          onToggleMobile={onToggleMobile}
        />
      </div>

      <div className={`header-nav-row ${mobileOpen ? "is-open" : ""}`}>
        <PrimaryNav />
        <CategoryNav />
      </div>
      <div className="cmyk-rule" aria-hidden="true" />
    </header>
  );
}

export default AppHeader;
