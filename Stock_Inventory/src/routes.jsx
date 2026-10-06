import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/customer/HomePage';
import CatalogPage from './pages/customer/CatalogPage';
import ProductDetailPage from './pages/customer/ProductDetailPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderHistoryPage from './pages/customer/OrderHistoryPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import LoginPage from './pages/customer/LoginPage';
import RegisterPage from './pages/customer/RegisterPage';
import { useCart } from './context/CartContext';

function CartRedirect() {
  const { openDrawer } = useCart();

  useEffect(() => {
    openDrawer();
  }, [openDrawer]);

  return <Navigate to="/shop" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/shop" element={<CatalogPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartRedirect />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders" element={<OrderHistoryPage />} />
      <Route path="/orders/:id" element={<OrderDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/profile" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
