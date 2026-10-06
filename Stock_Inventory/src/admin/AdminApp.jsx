import { Route, Routes, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRoute from './AdminRoute';
import adminRoutes from './routes';

export default function AdminApp() {
  return (
    <Routes>
      {/* Exception: Admin login remains accessible to anyone without guard */}
      <Route path="login" element={<AdminLoginPage />} />

      {/* Guard the entire admin route tree */}
      <Route element={<AdminRoute />}>
        {adminRoutes.map((route) => (
          <Route
            key={route.path || 'dashboard'}
            path={route.path}
            element={<AdminLayout>{route.element}</AdminLayout>}
          />
        ))}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
