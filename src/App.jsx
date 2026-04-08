import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./components/AppLayout";
import CartPage from "./pages/CartPage";
import CustomizePage from "./pages/CustomizePage";
import AdminAuthCallbackPage from "./pages/AdminAuthCallbackPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminRegisterPage from "./pages/AdminRegisterPage";
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductsPage from "./pages/ProductsPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<Navigate to="/cart" replace />} />
        <Route path="/customize" element={<CustomizePage />} />
        <Route path="/customize/:productId" element={<CustomizePage />} />
      </Route>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/register" element={<AdminRegisterPage />} />
      <Route path="/admin/auth/callback" element={<AdminAuthCallbackPage />} />
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
