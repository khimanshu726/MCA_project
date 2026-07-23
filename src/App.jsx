import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import AccountPage from "./pages/AccountPage";
import CartPage from "./pages/CartPage";
import CheckoutAddressPage from "./pages/CheckoutAddressPage";
import CheckoutReviewPage from "./pages/CheckoutReviewPage";
import CustomizePage from "./pages/CustomizePage";
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductsPage from "./pages/ProductsPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import PaymentFailedPage from "./pages/PaymentFailedPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import MyDesignsPage from "./pages/MyDesignsPage";
import AccountAddressesPage from "./pages/AccountAddressesPage";
import UserLoginPage from "./pages/UserLoginPage";
import UserRegisterPage from "./pages/UserRegisterPage";
import AuthActionPage from "./pages/AuthActionPage";
import WishlistPage from "./pages/WishlistPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import { CheckoutProvider } from "./context/CheckoutContext";
import { useCartMerge } from "./hooks/useCartMerge";

function CheckoutLayout() {
  return (
    <CheckoutProvider>
      <Outlet />
    </CheckoutProvider>
  );
}

function App() {
  // Mounted at the router root rather than inside AppLayout so it observes
  // the guest -> authenticated transition wherever it happens — including
  // /login (which renders outside AppLayout) and /customize. Previously
  // AppLayout mounted fresh *after* login had already resolved, so the
  // merge was skipped until the next full page load.
  useCartMerge();

  return (
    <>
      {/* Router-root, so it covers every internal navigation — footer links,
          header nav, cards, breadcrumbs — rather than only the places someone
          remembered to wire it up. */}
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          {/* Checkout now requires a signed-in customer (guest checkout is
              retired): a guest who reaches /checkout gets the auth modal over
              the page, and their guest cart is merged into the account on
              sign-in (see useCartMerge), so nothing in the basket is lost. */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute reason="Sign in to check out">
                <CheckoutLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="address" replace />} />
            <Route path="address" element={<CheckoutAddressPage />} />
            <Route path="review" element={<CheckoutReviewPage />} />
          </Route>
          <Route
            path="/account"
            element={
              <ProtectedRoute reason="Sign in to your account">
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute reason="Sign in to view your wishlist">
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/orders"
            element={
              <ProtectedRoute reason="Sign in to view your orders">
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/addresses"
            element={
              <ProtectedRoute reason="Sign in to manage your addresses">
                <AccountAddressesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/designs"
            element={
              <ProtectedRoute reason="Sign in to view your saved designs">
                <MyDesignsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/orders/:orderId"
            element={
              <ProtectedRoute reason="Sign in to view your order">
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
          <Route path="/payment-failed" element={<PaymentFailedPage />} />
        </Route>
        {/* The design studio owns its full viewport: it renders its own app bar
            instead of the storefront's promo strip + header + footer, the same
            way the auth screens do. Two stacked headers is what made it read as
            an editor bolted into an ecommerce page. */}
        <Route path="/customize" element={<CustomizePage />} />
        <Route path="/customize/:productId" element={<CustomizePage />} />
        <Route path="/login" element={<UserLoginPage />} />
        <Route path="/register" element={<UserRegisterPage />} />
        {/* Branded landing for Firebase verification / password-reset links
            (configure the custom action URL to point here — see docs/AUTH.md). */}
        <Route path="/auth/action" element={<AuthActionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
