import { Outlet } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { useUserAuth } from "../context/UserAuthContext";
import { useHeaderSearch, useHideOnScroll, useMobileMenu, useScrolled } from "../hooks/useLayoutState";
import AppHeader from "./AppHeader";
import SiteFooter from "./SiteFooter";
import WhatsAppButton from "./WhatsAppButton";

function AppLayout() {
  const { cartCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { isAuthenticated, signOut } = useUserAuth();
  const isScrolled = useScrolled();
  const hideOnScroll = useHideOnScroll();
  const { searchTerm, setSearchTerm, submit: handleSearchSubmit } = useHeaderSearch();
  const { mobileOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();

  // useCartMerge() now lives at the router root (App.jsx) so it also covers
  // the routes rendered outside this layout.

  return (
    <div className="app-shell">
      <AppHeader
        isScrolled={isScrolled}
        // Phones only (see .site-header.is-hidden): never while the menu is open.
        isHidden={hideOnScroll && !mobileOpen}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
        isAuthenticated={isAuthenticated}
        cartCount={cartCount}
        wishlistCount={wishlistItems.length}
        onSignOut={signOut}
        mobileOpen={mobileOpen}
        onToggleMobile={toggleMobileMenu}
        onCloseMobile={closeMobileMenu}
      />

      <Outlet />

      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}

export default AppLayout;
