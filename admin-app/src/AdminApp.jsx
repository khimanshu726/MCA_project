import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import AdminRoute from "./components/AdminRoute";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminHsnPage from "./pages/AdminHsnPage";
import AdminCollectionsPage from "./pages/AdminCollectionsPage";

function AdminApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/collections" element={<AdminCollectionsPage />} />
          <Route path="/admin/gst" element={<AdminHsnPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export default AdminApp;
