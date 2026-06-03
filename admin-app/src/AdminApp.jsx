import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import AdminRoute from "./components/AdminRoute";
import AdminAuthCallbackPage from "./pages/AdminAuthCallbackPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";

function AdminApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/auth/callback" element={<AdminAuthCallbackPage />} />
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export default AdminApp;
