import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import WholesaleBuyersPage from './pages/WholesaleBuyersPage';
import WholesaleOrdersPage from './pages/WholesaleOrdersPage';
import StockMovementsPage from './pages/StockMovementsPage';
import LowStockPage from './pages/LowStockPage';
import SettingsPage from './pages/SettingsPage';

const adminRoutes = [
  { path: '', element: <DashboardPage /> },
  { path: 'users', element: <UsersPage /> },
  { path: 'orders', element: <OrdersPage /> },
  { path: 'products', element: <ProductsPage /> },
  { path: 'categories', element: <CategoriesPage /> },
  { path: 'suppliers', element: <SuppliersPage /> },
  { path: 'purchase-orders', element: <PurchaseOrdersPage /> },
  { path: 'wholesale-buyers', element: <WholesaleBuyersPage /> },
  { path: 'wholesale-orders', element: <WholesaleOrdersPage /> },
  { path: 'stock-movements', element: <StockMovementsPage /> },
  { path: 'low-stock', element: <LowStockPage /> },
  { path: 'settings', element: <SettingsPage /> },
];

export default adminRoutes;
