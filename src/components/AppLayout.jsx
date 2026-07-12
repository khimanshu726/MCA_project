import { Outlet } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";
import { useHeaderSearch, useMobileMenu, useScrolled } from "../hooks/useLayoutState";
import AppHeader from "./AppHeader";
import PromoStrip from "./PromoStrip";
import SiteFooter from "./SiteFooter";

function AppLayout() {
  const { cartCount } = useCart();
  const { isAuthenticated, signOut } = useUserAuth();
  const isScrolled = useScrolled();
  const { searchTerm, setSearchTerm, submit: handleSearchSubmit } = useHeaderSearch();
  const { mobileOpen, toggle: toggleMobileMenu } = useMobileMenu();

  return (
    <div className="app-shell">
      <PromoStrip />

      <AppHeader
        isScrolled={isScrolled}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
        isAuthenticated={isAuthenticated}
        cartCount={cartCount}
        onSignOut={signOut}
        mobileOpen={mobileOpen}
        onToggleMobile={toggleMobileMenu}
      />

      <Outlet />

      <SiteFooter />
    </div>
  );
}

export default AppLayout;
