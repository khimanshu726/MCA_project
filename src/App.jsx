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
import UserLoginPage from "./pages/UserLoginPage";
import UserRegisterPage from "./pages/UserRegisterPage";
import WishlistPage from "./pages/WishlistPage";
import ProtectedRoute from "./components/ProtectedRoute";
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
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutLayout />}>
          <Route index element={<Navigate to="address" replace />} />
          <Route path="address" element={<CheckoutAddressPage />} />
          <Route path="review" element={<CheckoutReviewPage />} />
        </Route>
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/designs"
          element={
            <ProtectedRoute>
              <MyDesignsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/orders/:orderId"
          element={
            <ProtectedRoute>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
