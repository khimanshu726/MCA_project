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
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import UserLoginPage from "./pages/UserLoginPage";
import UserRegisterPage from "./pages/UserRegisterPage";
import WishlistPage from "./pages/WishlistPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { CheckoutProvider } from "./context/CheckoutContext";

function CheckoutLayout() {
  return (
    <CheckoutProvider>
      <Outlet />
    </CheckoutProvider>
  );
}

function App() {
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
        <Route path="/customize" element={<CustomizePage />} />
        <Route path="/customize/:productId" element={<CustomizePage />} />
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
          path="/account/orders/:orderId"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/order-success" element={<OrderSuccessPage />} />
        <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
      </Route>
      <Route path="/login" element={<UserLoginPage />} />
      <Route path="/register" element={<UserRegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
