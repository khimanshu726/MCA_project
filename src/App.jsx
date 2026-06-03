import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import AccountPage from "./pages/AccountPage";
import CartPage from "./pages/CartPage";
import CustomizePage from "./pages/CustomizePage";
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductsPage from "./pages/ProductsPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import UserLoginPage from "./pages/UserLoginPage";
import UserRegisterPage from "./pages/UserRegisterPage";

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
        <Route path="/account" element={<AccountPage />} />
        <Route path="/order-success" element={<OrderSuccessPage />} />
      </Route>
      <Route path="/login" element={<UserLoginPage />} />
      <Route path="/register" element={<UserRegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
