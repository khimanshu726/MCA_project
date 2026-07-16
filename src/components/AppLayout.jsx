import { Outlet } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { useUserAuth } from "../context/UserAuthContext";
import { useHeaderSearch, useMobileMenu, useScrolled } from "../hooks/useLayoutState";
import AppHeader from "./AppHeader";
import PromoStrip from "./PromoStrip";
import SiteFooter from "./SiteFooter";

function AppLayout() {
  const { cartCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { isAuthenticated, signOut } = useUserAuth();
  const isScrolled = useScrolled();
  const { searchTerm, setSearchTerm, submit: handleSearchSubmit } = useHeaderSearch();
  const { mobileOpen, toggle: toggleMobileMenu } = useMobileMenu();

  // useCartMerge() now lives at the router root (App.jsx) so it also covers
  // the routes rendered outside this layout.

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
        wishlistCount={wishlistItems.length}
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
