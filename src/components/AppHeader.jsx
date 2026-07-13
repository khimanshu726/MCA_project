import { Link, NavLink } from "react-router-dom";
import { ShoppingBag, User, LogOut, Menu, X } from "lucide-react";
import { categoryMenu, navigationLinks } from "../data";

function BrandBlock() {
  return (
    <Link to="/" className="brand-block" aria-label="Elite Empressions home">
      <h1>Elite Empressions</h1>
    </Link>
  );
}

function HeaderSearch({ searchTerm, onSearchTermChange, onSubmit }) {
  return (
    <form className="header-search" onSubmit={onSubmit} role="search">
      <label className="search-label" htmlFor="store-search">
        Search products
      </label>
      <div className="search-field-row">
        <input
          id="store-search"
          type="search"
          placeholder="Search cards, flyers, banners, mugs..."
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          aria-label="Search products"
        />
        <button type="submit" className="primary-button search-submit">
          Search
        </button>
      </div>
    </form>
  );
}

function AccountActions({ isAuthenticated, cartCount, onSignOut, mobileOpen, onToggleMobile }) {
  return (
    <div className="account-actions">
      <NavLink
        to={isAuthenticated ? "/account" : "/login"}
        className={({ isActive }) => `nav-link utility-link ${isActive ? "active" : ""}`}
        aria-label={isAuthenticated ? "My account" : "Log in"}
      >
        <User size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="hide-mobile">{isAuthenticated ? "Account" : "Login"}</span>
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
  onSignOut,
  mobileOpen,
  onToggleMobile,
}) {
  return (
    <header className={`site-header ${isScrolled ? "is-scrolled" : ""}`}>
      <div className="header-main-row">
        <BrandBlock />

        <HeaderSearch
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
          onSubmit={onSearchSubmit}
        />

        <AccountActions
          isAuthenticated={isAuthenticated}
          cartCount={cartCount}
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
