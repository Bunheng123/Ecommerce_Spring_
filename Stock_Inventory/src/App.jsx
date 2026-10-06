import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/customer/Navbar';
import Footer from './components/customer/Footer';
import CartDrawer from './components/customer/CartDrawer';
import AppRoutes from './routes';
import AdminApp from './admin/AdminApp';

function CustomerLayout() {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-background text-ink font-sans">
        <Navbar />
        <main className="flex-1">
          <AppRoutes />
        </main>
        <Footer />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/*" element={<CustomerLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
