import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { getAllOrders } from '../../api/orders';
import { fetchLowStockProducts } from '../../api/products';
import { fetchStockMovements } from '../../api/stockMovements';
import { AlertDialog } from '../utils/swalConfig';

/**
 * Extracts the exact backend error message from a failed API response.
 */
function getBackendErrorMessage(err, fallback = 'Operation failed') {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;
  if (typeof msg === 'string') {
    return msg.replace(/^Error\s*:\s*/i, '').trim();
  }
  return fallback;
}

/**
 * Clean date formatter for activity feeds and ledger entries.
 */
function formatActivityDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Parallel data fetching: GET /api/orders, GET /api/products/low-stock, GET /api/stock-movements
  const loadDashboardData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const [ordersData, lowStockData, movementsData] = await Promise.all([
        getAllOrders(),
        fetchLowStockProducts(),
        fetchStockMovements(),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setLowStockProducts(Array.isArray(lowStockData) ? lowStockData : []);
      setStockMovements(Array.isArray(movementsData) ? movementsData : []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      const msg = getBackendErrorMessage(err, 'Unable to load dashboard telemetry from server');
      AlertDialog.fire({ title: 'Load Failed', text: msg });
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getAllOrders(),
      fetchLowStockProducts(),
      fetchStockMovements(),
    ])
      .then(([ordersData, lowStockData, movementsData]) => {
        if (!isMounted) return;
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setLowStockProducts(Array.isArray(lowStockData) ? lowStockData : []);
        setStockMovements(Array.isArray(movementsData) ? movementsData : []);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load dashboard telemetry:', err);
        const msg = getBackendErrorMessage(err, 'Unable to load dashboard telemetry from server');
        AlertDialog.fire({ title: 'Load Failed', text: msg });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ─── KPI Calculations ──────────────────────────────────────────────────────

  // 1. Total Orders: Total count of orders
  const totalOrdersCount = orders.length;

  // 2. Pending Orders: Count of orders where status === "PENDING"
  const pendingOrdersCount = useMemo(() => {
    return orders.filter(
      (o) => String(o.status || '').toUpperCase() === 'PENDING'
    ).length;
  }, [orders]);

  // 3. Total Revenue: Sum strictly from COMPLETED orders (do NOT include CANCELLED even if paid)
  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => String(o.status || '').toUpperCase() === 'COMPLETED')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [orders]);

  // 4. Low-Stock Count: Count of items returned by GET /api/products/low-stock
  const lowStockCount = lowStockProducts.length;

  // ─── Recent Activity Calculations ──────────────────────────────────────────

  // Top 5 Recent Orders: sorted newest-first (orderDate descending)
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const timeA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
        const timeB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [orders]);

  // Top 5 Recent Stock Movements: sorted newest-first (createdAt descending)
  const recentMovements = useMemo(() => {
    return [...stockMovements]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [stockMovements]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            EXECUTIVE OVERVIEW
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
            Operations Dashboard
          </h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Live telemetry, inventory alerts, and order settlement performance.
          </p>
        </div>

        {/* Refresh Action */}
        <button
          type="button"
          onClick={() => loadDashboardData(true)}
          disabled={loading}
          className="h-10 px-4 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-800 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-60 self-start sm:self-auto"
        >
          <svg
            className={`w-3.5 h-3.5 text-neutral-600 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* KPI Stat Cards (using shadow-surface and real backend data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Total Orders */}
        <Link to="/admin/orders" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Total Orders"
            value={loading ? '...' : String(totalOrdersCount).padStart(2, '0')}
            subtext="Processed in system"
            badge="Live DB"
            icon={
              <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />
        </Link>

        {/* KPI 2: Pending Orders */}
        <Link to="/admin/orders" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Pending Orders"
            value={loading ? '...' : String(pendingOrdersCount).padStart(2, '0')}
            subtext="Awaiting fulfillment"
            badge={pendingOrdersCount > 0 ? 'Needs Action' : 'All Clear'}
            trend={pendingOrdersCount > 0 ? 'Action Req.' : 'Nominal'}
            trendUp={pendingOrdersCount === 0}
            icon={
              <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </Link>

        {/* KPI 3: Total Revenue (strictly COMPLETED orders) */}
        <div>
          <StatCard
            title="Total Revenue"
            value={
              loading
                ? '...'
                : `$${totalRevenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
            }
            subtext="Completed orders only"
            trend="Settled"
            trendUp={true}
            icon={
              <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* KPI 4: Low-Stock Count */}
        <Link to="/admin/low-stock" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Low-Stock Alerts"
            value={loading ? '...' : String(lowStockCount).padStart(2, '0')}
            subtext="At or below reorder level"
            badge={lowStockCount > 0 ? 'Restock' : 'Healthy'}
            trend={lowStockCount > 0 ? 'Low Stock' : 'Nominal'}
            trendUp={lowStockCount === 0}
            icon={
              <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </Link>
      </div>

      {/* Recent Activity Sections (2 Columns with scrollable bodies and shadow-surface) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Recent Orders Table */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
                  Recent Orders
                </h2>
                <p className="text-xs font-bold text-neutral-400 mt-0.5">
                  Latest customer purchases &amp; statuses
                </p>
              </div>

              <Link
                to="/admin/orders"
                className="text-xs font-black uppercase tracking-wider text-neutral-900 hover:text-neutral-600 flex items-center gap-1.5 transition-colors"
              >
                <span>Manage Orders</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {/* Scrollable table container */}
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto mt-4 border border-neutral-200/80 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-[#FAFBFD] z-10 border-b border-neutral-200 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                  <tr>
                    <th className="py-3 px-3 whitespace-nowrap">Order ID</th>
                    <th className="py-3 px-3 whitespace-nowrap">Customer</th>
                    <th className="py-3 px-3 whitespace-nowrap">Total</th>
                    <th className="py-3 px-3 whitespace-nowrap">Status</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400">
                        <span className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin inline-block mb-2" />
                        <p className="text-xs font-bold uppercase tracking-wider">Loading orders...</p>
                      </td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-400 text-xs">
                        No recent orders found.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => {
                      const status = String(order.status || 'PENDING').toUpperCase();

                      return (
                        <tr key={order.id} className="hover:bg-[#F9FAFC] transition-colors">
                          {/* Order ID */}
                          <td className="py-3 px-3 font-mono font-black text-neutral-900 whitespace-nowrap">
                            #{order.id}
                          </td>

                          {/* Customer Username */}
                          <td className="py-3 px-3 font-bold text-neutral-900 font-mono whitespace-nowrap">
                            {order.username ? `@${order.username}` : `User #${order.userId || 'N/A'}`}
                          </td>

                          {/* Total */}
                          <td className="py-3 px-3 font-black text-neutral-900 whitespace-nowrap">
                            ${Number(order.totalAmount || 0).toFixed(2)}
                          </td>

                          {/* Status: Plain outlined text pill (monochrome palette, no colored badge) */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-neutral-300 text-neutral-800 bg-white">
                              {status}
                            </span>
                          </td>

                          {/* Navigation link to Admin Orders */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <Link
                              to="/admin/orders"
                              className="text-[11px] font-black uppercase tracking-wider text-neutral-900 hover:text-neutral-600 underline underline-offset-2"
                            >
                              View &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-neutral-100 flex justify-end">
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              See all {orders.length} orders in Ledger &rarr;
            </Link>
          </div>
        </div>

        {/* Section 2: Recent Stock Movements List */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
                  Recent Stock Movements
                </h2>
                <p className="text-xs font-bold text-neutral-400 mt-0.5">
                  Latest warehouse adjustments &amp; shipments
                </p>
              </div>

              <Link
                to="/admin/stock-movements"
                className="text-xs font-black uppercase tracking-wider text-neutral-900 hover:text-neutral-600 flex items-center gap-1.5 transition-colors"
              >
                <span>Audit Trail</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {/* Scrollable table container */}
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto mt-4 border border-neutral-200/80 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-[#FAFBFD] z-10 border-b border-neutral-200 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                  <tr>
                    <th className="py-3 px-3 whitespace-nowrap">Product</th>
                    <th className="py-3 px-3 whitespace-nowrap">Type</th>
                    <th className="py-3 px-3 whitespace-nowrap">Qty</th>
                    <th className="py-3 px-3 whitespace-nowrap">Reason</th>
                    <th className="py-3 px-3 whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400">
                        <span className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin inline-block mb-2" />
                        <p className="text-xs font-bold uppercase tracking-wider">Loading movements...</p>
                      </td>
                    </tr>
                  ) : recentMovements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-400 text-xs">
                        No recent stock movements recorded.
                      </td>
                    </tr>
                  ) : (
                    recentMovements.map((movement) => {
                      const type = String(movement.type || 'ADJUSTMENT').toUpperCase();
                      const productName =
                        movement.productName ||
                        (movement.productId ? `Product #${movement.productId}` : 'Artifact');

                      return (
                        <tr key={movement.id} className="hover:bg-[#F9FAFC] transition-colors">
                          {/* Product */}
                          <td className="py-3 px-3 font-bold text-neutral-900 whitespace-nowrap max-w-[160px] truncate" title={productName}>
                            {productName}
                          </td>

                          {/* Movement Type: Plain outlined text pill (monochrome palette, no colored badge) */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-neutral-300 text-neutral-800 bg-white">
                              {type.replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Quantity */}
                          <td className="py-3 px-3 font-mono font-black text-neutral-900 whitespace-nowrap">
                            {movement.quantity}
                          </td>

                          {/* Reason */}
                          <td className="py-3 px-3 text-neutral-600 max-w-[140px] truncate whitespace-nowrap" title={movement.reason || '—'}>
                            {movement.reason || '—'}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3 text-neutral-500 whitespace-nowrap font-medium text-[11px]">
                            {formatActivityDate(movement.createdAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-neutral-100 flex justify-end">
            <Link
              to="/admin/stock-movements"
              className="text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              See all {stockMovements.length} movements in Audit Trail &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
