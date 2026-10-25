import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import SmoothSalesTrendChart from '../components/SmoothSalesTrendChart';
import { getAllOrders } from '../../api/orders';
import { getAllWholesaleOrders } from '../../api/wholesaleOrders';
import { fetchLowStockProducts, fetchCategories } from '../../api/products';
import { fetchBrands } from '../../api/brands';
import { fetchStockMovements } from '../../api/stockMovements';
import { fetchReportSummary } from '../../api/reports';

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
  const [wholesaleOrders, setWholesaleOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [overallSummary, setOverallSummary] = useState(null);
  const [chartView, setChartView] = useState('TIME'); // TIME, CATEGORY, BRAND
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  // Quick filter selectors on Dashboard card
  const [dashboardRange, setDashboardRange] = useState('7D'); // '7D', '30D', 'MONTHLY'
  const [dashboardCategory, setDashboardCategory] = useState('');
  const [dashboardBrand, setDashboardBrand] = useState('');

  // Date range and granularity derivation for dashboard chart
  const { dashStartDate, dashEndDate, dashGranularity } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dashboardRange === '7D') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      return {
        dashStartDate: past.toISOString().split('T')[0],
        dashEndDate: todayStr,
        dashGranularity: 'daily',
      };
    } else if (dashboardRange === '30D') {
      const past = new Date(now);
      past.setDate(now.getDate() - 29);
      return {
        dashStartDate: past.toISOString().split('T')[0],
        dashEndDate: todayStr,
        dashGranularity: 'daily',
      };
    } else {
      return {
        dashStartDate: '',
        dashEndDate: '',
        dashGranularity: 'monthly',
      };
    }
  }, [dashboardRange]);

  // Derived filter label for display in chart header badge
  const activeDashboardFilter = useMemo(() => {
    const parts = [];
    if (dashboardCategory) {
      const cat = categories.find((c) => String(c.id) === String(dashboardCategory));
      parts.push(`Category: ${cat ? cat.name : dashboardCategory}`);
    }
    if (dashboardBrand) {
      if (dashboardBrand === '__unbranded__') {
        parts.push('Brand: Unbranded');
      } else {
        const b = brands.find((br) => String(br.id) === String(dashboardBrand));
        parts.push(`Brand: ${b ? b.name : dashboardBrand}`);
      }
    }
    return parts.length > 0 ? parts.join(' • ') : null;
  }, [dashboardCategory, dashboardBrand, categories, brands]);

  // Resilient parallel data fetching using Promise.allSettled
  const loadDashboardData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const [ordersRes, wholesaleRes, lowStockRes, movementsRes, catsRes, brandsRes, summaryRes] = await Promise.allSettled([
        getAllOrders(),
        getAllWholesaleOrders(),
        fetchLowStockProducts(),
        fetchStockMovements(),
        fetchCategories(),
        fetchBrands(),
        fetchReportSummary({}),
      ]);

      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
        setOrders(ordersRes.value);
      }
      if (wholesaleRes.status === 'fulfilled' && Array.isArray(wholesaleRes.value)) {
        setWholesaleOrders(wholesaleRes.value);
      }
      if (lowStockRes.status === 'fulfilled' && Array.isArray(lowStockRes.value)) {
        setLowStockProducts(lowStockRes.value);
      }
      if (movementsRes.status === 'fulfilled' && Array.isArray(movementsRes.value)) {
        setStockMovements(movementsRes.value);
      }
      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value)) {
        setCategories(catsRes.value);
      }
      if (brandsRes.status === 'fulfilled' && Array.isArray(brandsRes.value)) {
        setBrands(brandsRes.value);
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setOverallSummary(summaryRes.value);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
  }, []);

  // Fetch report summary independently for resilience and dynamic filtering
  useEffect(() => {
    let active = true;
    setReportLoading(true);

    const params = {};
    if (dashStartDate) params.startDate = dashStartDate;
    if (dashEndDate) params.endDate = dashEndDate;
    if (dashboardCategory) params.categoryId = dashboardCategory;
    if (dashboardBrand) {
      if (dashboardBrand === '__unbranded__') {
        params.unbrandedOnly = true;
      } else {
        params.brandId = dashboardBrand;
      }
    }

    fetchReportSummary(params)
      .then((res) => {
        if (active) setReportData(res);
      })
      .catch((err) => {
        console.error('Failed to load dashboard report summary:', err);
      })
      .finally(() => {
        if (active) setReportLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dashStartDate, dashEndDate, dashboardCategory, dashboardBrand]);

  // ─── KPI Calculations (Unified Retail & Wholesale Channels) ────────────────

  // 1. Total Orders: retailOrders.length + wholesaleOrders.length
  const retailOrdersCount = orders.length;
  const wholesaleOrdersCount = wholesaleOrders.length;
  const totalOrdersCount = retailOrdersCount + wholesaleOrdersCount;

  // 2. Pending Orders: pendingRetailCount + pendingWholesaleCount
  const pendingRetailCount = useMemo(() => {
    return orders.filter(
      (o) => String(o.status || '').toUpperCase() === 'PENDING'
    ).length;
  }, [orders]);

  const pendingWholesaleCount = useMemo(() => {
    return wholesaleOrders.filter(
      (w) => String(w.status || '').toUpperCase() === 'PENDING'
    ).length;
  }, [wholesaleOrders]);

  const pendingOrdersCount = pendingRetailCount + pendingWholesaleCount;

  // 3. Cancelled Orders: cancelledRetailCount + cancelledWholesaleCount
  const cancelledRetailCount = useMemo(() => {
    return orders.filter(
      (o) => String(o.status || '').toUpperCase() === 'CANCELLED'
    ).length;
  }, [orders]);

  const cancelledWholesaleCount = useMemo(() => {
    return wholesaleOrders.filter(
      (w) => String(w.status || '').toUpperCase() === 'CANCELLED'
    ).length;
  }, [wholesaleOrders]);

  const cancelledOrdersCount = cancelledRetailCount + cancelledWholesaleCount;

  // 4. Total Revenue: completedRetailRevenue + completedWholesaleRevenue
  const completedRetailRevenue = useMemo(() => {
    return orders
      .filter((o) => String(o.status || '').toUpperCase() === 'COMPLETED')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [orders]);

  const completedWholesaleRevenue = useMemo(() => {
    return wholesaleOrders
      .filter((w) => String(w.status || '').toUpperCase() === 'COMPLETED')
      .reduce((sum, w) => sum + (Number(w.totalAmount) || 0), 0);
  }, [wholesaleOrders]);

  const totalRevenue = completedRetailRevenue + completedWholesaleRevenue;

  // 5. Total Profit & Margin (Settled gross profit and FIFO depletion metrics)
  const totalProfit = useMemo(() => {
    const profitVal = overallSummary?.kpis?.grossProfit ?? reportData?.kpis?.grossProfit;
    return profitVal != null ? Number(profitVal) : 0;
  }, [overallSummary, reportData]);

  const profitMarginPercent = useMemo(() => {
    const marginVal = overallSummary?.kpis?.profitMarginPercent ?? reportData?.kpis?.profitMarginPercent;
    return marginVal != null ? Number(marginVal) : 0;
  }, [overallSummary, reportData]);

  // 6. Low-Stock Count: Count of items returned by GET /api/products/low-stock
  const lowStockCount = lowStockProducts.length;

  // ─── Recent Activity Calculations ──────────────────────────────────────────

  // Top 5 Recent Orders: sorted newest-first (orderDate descending) from both Retail and Wholesale
  const recentOrders = useMemo(() => {
    const retailMapped = orders.map((o) => ({
      id: o.id,
      channel: 'RETAIL',
      orderDate: o.orderDate,
      customer: o.username ? `@${o.username}` : (o.userId ? `User #${o.userId}` : 'Customer'),
      totalAmount: Number(o.totalAmount || 0),
      status: String(o.status || 'PENDING').toUpperCase(),
      targetUrl: '/admin/orders',
    }));

    const wholesaleMapped = wholesaleOrders.map((w) => ({
      id: w.id,
      channel: 'WHOLESALE',
      orderDate: w.orderDate || w.updateDate,
      customer: w.buyerName || (w.buyerId ? `Buyer #${w.buyerId}` : 'Wholesale Buyer'),
      totalAmount: Number(w.totalAmount || 0),
      status: String(w.status || 'PENDING').toUpperCase(),
      targetUrl: '/admin/wholesale-orders',
    }));

    return [...retailMapped, ...wholesaleMapped]
      .sort((a, b) => {
        const timeA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
        const timeB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [orders, wholesaleOrders]);

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

  // ─── Financial Performance & Profit Telemetry ──────────────────────────────
  const reportKpis = reportData?.kpis || {
    grossProfit: 0,
    totalCogs: 0,
    profitMarginPercent: 0,
    totalUnitsSold: 0,
  };

  const trendPoints = useMemo(() => {
    if (dashGranularity === 'monthly') {
      return reportData?.salesOverTime?.monthly || [];
    }
    return reportData?.salesOverTime?.daily || [];
  }, [reportData, dashGranularity]);

  const categoryPoints = useMemo(() => {
    return reportData?.revenueByCategory || [];
  }, [reportData]);

  const brandPoints = useMemo(() => {
    return reportData?.revenueByBrand || [];
  }, [reportData]);

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

      {/* KPI Stat Cards (using shadow-surface and real backend data - 3 per row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Row 1 / Card 1: Total Orders */}
        <Link to="/admin/orders" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Total Orders"
            value={loading ? '...' : String(totalOrdersCount).padStart(2, '0')}
            subtext={`${retailOrdersCount} Retail • ${wholesaleOrdersCount} Wholesale`}
            badge="Live DB"
            icon={
              <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />
        </Link>

        {/* Row 1 / Card 2: Pending Orders */}
        <Link to="/admin/orders" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Pending Orders"
            value={loading ? '...' : String(pendingOrdersCount).padStart(2, '0')}
            subtext={`${pendingRetailCount} Retail • ${pendingWholesaleCount} Wholesale awaiting action`}
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

        {/* Row 1 / Card 3: Cancelled Orders */}
        <Link to="/admin/orders" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Cancelled Orders"
            value={loading ? '...' : String(cancelledOrdersCount).padStart(2, '0')}
            subtext={`${cancelledRetailCount} Retail • ${cancelledWholesaleCount} Wholesale cancelled`}
            badge={cancelledOrdersCount > 0 ? 'Voided' : 'All Clear'}
            trend={cancelledOrdersCount > 0 ? 'Cancelled' : 'Clean'}
            trendUp={cancelledOrdersCount === 0}
            icon={
              <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </Link>

        {/* Row 2 / Card 4: Total Revenue (strictly COMPLETED orders) */}
        <Link to="/admin/reports" className="block transition-transform hover:-translate-y-0.5">
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
            subtext={`Retail: $${completedRetailRevenue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} • Wholesale: $${completedWholesaleRevenue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            trend="Settled"
            trendUp={true}
            icon={
              <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </Link>

        {/* Row 2 / Card 5: Total Profit */}
        <Link to="/admin/reports" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Total Profit"
            value={
              loading
                ? '...'
                : `$${totalProfit.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
            }
            subtext={`${profitMarginPercent.toFixed(1)}% Margin • Net after COGS`}
            badge={totalProfit >= 0 ? 'Net Gain' : 'Deficit'}
            trend={profitMarginPercent > 0 ? `${profitMarginPercent.toFixed(1)}%` : 'Net Profit'}
            trendUp={totalProfit >= 0}
            icon={
              <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </Link>

        {/* Row 2 / Card 6: Low-Stock Alerts */}
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

      {/* ── Visual Performance & Profit Overview (Section F Upgrade) ───── */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-neutral-900 text-white">
                FINANCIAL TELEMETRY
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Settled Orders
              </span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">
              Visual Revenue &amp; Profit Overview
            </h2>
            <p className="text-xs font-bold text-neutral-400 mt-0.5">
              Settled sales wave, COGS depletion cost, and dimensional performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher */}
            <div className="flex rounded-xl p-1 bg-neutral-100 border border-neutral-200/70">
              <button
                type="button"
                onClick={() => setChartView('TIME')}
                className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                  chartView === 'TIME' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Trend Wave
              </button>
              <button
                type="button"
                onClick={() => setChartView('CATEGORY')}
                className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                  chartView === 'CATEGORY' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                By Category
              </button>
              <button
                type="button"
                onClick={() => setChartView('BRAND')}
                className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                  chartView === 'BRAND' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                By Brand
              </button>
            </div>

            {/* Link to Full Reports */}
            <Link
              to="/admin/reports"
              className="h-9 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <span>Full Analytics &amp; CSV Export</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Quick Filter Selectors (7D / 30D / Monthly, Category, Brand) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-50/80 rounded-2xl border border-neutral-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mr-1">
              Timeframe:
            </span>
            <div className="inline-flex rounded-xl p-1 bg-white border border-neutral-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setDashboardRange('7D')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  dashboardRange === '7D'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setDashboardRange('30D')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  dashboardRange === '30D'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setDashboardRange('MONTHLY')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  dashboardRange === 'MONTHLY'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Category:
              </span>
              <select
                value={dashboardCategory}
                onChange={(e) => setDashboardCategory(e.target.value)}
                className="h-8 px-2.5 bg-white border border-neutral-200/80 rounded-xl text-xs font-bold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 shadow-2xs"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Brand:
              </span>
              <select
                value={dashboardBrand}
                onChange={(e) => setDashboardBrand(e.target.value)}
                className="h-8 px-2.5 bg-white border border-neutral-200/80 rounded-xl text-xs font-bold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 shadow-2xs"
              >
                <option value="">All Brands</option>
                <option value="__unbranded__">Unbranded Only</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {(dashboardCategory || dashboardBrand || dashboardRange !== '7D') && (
              <button
                type="button"
                onClick={() => {
                  setDashboardCategory('');
                  setDashboardBrand('');
                  setDashboardRange('7D');
                }}
                className="h-8 px-2.5 text-[11px] font-bold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-xl transition-colors cursor-pointer"
                title="Reset filters to default"
              >
                Reset
              </button>
            )}

            {reportLoading && (
              <span
                className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin ml-1"
                title="Updating chart data..."
              />
            )}
          </div>
        </div>

        {/* Quick Profit KPI Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl border border-neutral-100 bg-neutral-50/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
              Net Profit
            </span>
            <span className="text-base font-black text-emerald-700">
              {loading ? '...' : `$${Number(reportKpis.grossProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl border border-neutral-100 bg-neutral-50/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
              Total COGS
            </span>
            <span className="text-base font-black text-neutral-800">
              {loading ? '...' : `$${Number(reportKpis.totalCogs || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl border border-neutral-100 bg-neutral-50/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
              Gross Margin
            </span>
            <span className="text-base font-black text-neutral-900">
              {loading ? '...' : `${Number(reportKpis.profitMarginPercent || 0).toFixed(2)}%`}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl border border-neutral-100 bg-neutral-50/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">
              Settled Volume
            </span>
            <span className="text-base font-black text-neutral-900">
              {loading ? '...' : `${reportKpis.totalUnitsSold || 0} Units`}
            </span>
          </div>
        </div>

        {/* Main Chart Canvas / Dimensional Views */}
        <div className="relative">
          {reportLoading && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur rounded-full border border-neutral-200 text-[10px] font-bold text-neutral-600 shadow-xs">
              <span className="w-2.5 h-2.5 border-2 border-neutral-400 border-t-neutral-900 rounded-full animate-spin" />
              <span>Updating graph...</span>
            </div>
          )}

          {chartView === 'TIME' ? (
            <SmoothSalesTrendChart
              data={trendPoints}
              granularity={dashGranularity}
              startDate={dashStartDate}
              endDate={dashEndDate}
              title={
                dashboardRange === '7D'
                  ? 'Daily Sales & Revenue Trend (Past 7 Days)'
                  : dashboardRange === '30D'
                  ? 'Daily Sales & Revenue Trend (Past 30 Days)'
                  : 'Monthly Sales & Revenue Trend'
              }
              subtitle="Settled sales wave (revenue & gross profit) and order volume over time"
              activeFilterBadge={activeDashboardFilter}
              onClearFilter={() => {
                setDashboardCategory('');
                setDashboardBrand('');
              }}
              height={320}
            />
          ) : chartView === 'CATEGORY' ? (
            <div className="border border-neutral-200/80 rounded-2xl p-6 bg-white space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">
                    Revenue by Category
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Category performance for selected timeframe
                  </p>
                </div>
                <span className="text-xs font-bold text-neutral-500">
                  {categoryPoints.length} Categories
                </span>
              </div>
              {categoryPoints.length === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-neutral-400">
                  No completed sales recorded for categories in this range.
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryPoints.map((cat) => {
                    const rev = Number(cat.revenue || 0);
                    const profit = Number(cat.profit || 0);
                    const totalRev = Number(reportKpis.totalRevenue || 1);
                    const pct = Math.min(100, Math.max(3, Math.round((rev / (totalRev || rev || 1)) * 100)));
                    return (
                      <div key={cat.id || cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-neutral-800">{cat.name}</span>
                          <span className="font-mono font-bold text-neutral-900">
                            ${rev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-emerald-700 ml-2 font-normal">
                              (+${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${pct}%` }}
                            className="bg-neutral-900 rounded-full h-full transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="border border-neutral-200/80 rounded-2xl p-6 bg-white space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">
                    Revenue by Brand
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Brand performance for selected timeframe
                  </p>
                </div>
                <span className="text-xs font-bold text-neutral-500">
                  {brandPoints.length} Brands
                </span>
              </div>
              {brandPoints.length === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-neutral-400">
                  No completed sales recorded for brands in this range.
                </div>
              ) : (
                <div className="space-y-3">
                  {brandPoints.map((b) => {
                    const rev = Number(b.revenue || 0);
                    const profit = Number(b.profit || 0);
                    const totalRev = Number(reportKpis.totalRevenue || 1);
                    const pct = Math.min(100, Math.max(3, Math.round((rev / (totalRev || rev || 1)) * 100)));
                    return (
                      <div key={b.id || b.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-neutral-800">{b.name}</span>
                          <span className="font-mono font-bold text-neutral-900">
                            ${rev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-emerald-700 ml-2 font-normal">
                              (+${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${pct}%` }}
                            className="bg-neutral-900 rounded-full h-full transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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
                    <th className="py-3 px-3 whitespace-nowrap">Channel</th>
                    <th className="py-3 px-3 whitespace-nowrap">Customer</th>
                    <th className="py-3 px-3 whitespace-nowrap">Total</th>
                    <th className="py-3 px-3 whitespace-nowrap">Status</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        <span className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin inline-block mb-2" />
                        <p className="text-xs font-bold uppercase tracking-wider">Loading orders...</p>
                      </td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                        No recent orders found.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => {
                      const status = String(order.status || 'PENDING').toUpperCase();
                      const isWholesale = order.channel === 'WHOLESALE';

                      return (
                        <tr key={`${order.channel}-${order.id}`} className="hover:bg-[#F9FAFC] transition-colors">
                          {/* Order ID */}
                          <td className="py-3 px-3 font-mono font-black text-neutral-900 whitespace-nowrap">
                            #{order.id}
                          </td>

                          {/* Channel Badge */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                isWholesale
                                  ? 'border-indigo-200 bg-indigo-50/70 text-indigo-700'
                                  : 'border-neutral-200 bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {order.channel}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-3 font-bold text-neutral-900 font-mono whitespace-nowrap">
                            {order.customer}
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

                          {/* Navigation link to specific channel orders page */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <Link
                              to={order.targetUrl}
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

          <div className="pt-4 mt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
            <Link
              to="/admin/wholesale-orders"
              className="text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              See all {wholesaleOrders.length} Wholesale Orders &rarr;
            </Link>
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              See all {orders.length} Retail Orders &rarr;
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
