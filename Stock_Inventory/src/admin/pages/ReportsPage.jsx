import { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard';
import SmoothSalesTrendChart from '../components/SmoothSalesTrendChart';
import { fetchReportSummary } from '../../api/reports';
import { fetchCategories } from '../../api/products';
import { fetchBrands } from '../../api/brands';
import { AlertDialog } from '../utils/swalConfig';

function formatCurrency(val) {
  const num = Number(val) || 0;
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(val) {
  const num = Number(val) || 0;
  return `${num.toFixed(2)}%`;
}

/**
 * Downloads a UTF-8 BOM CSV compatible with Microsoft Excel.
 * Escapes characters =, +, -, @ to prevent formula injection.
 */
function downloadCsv(filename, rows) {
  const csvContent = rows
    .map((row) =>
      row
        .map((field) => {
          if (field === null || field === undefined) return '""';
          let str = String(field);
          if (/^[=+\-@]/.test(str.trim())) {
            str = `'` + str;
          }
          str = str.replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    )
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [datePreset, setDatePreset] = useState('ALL'); // ALL, 7D, 30D, THIS_MONTH, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [channel, setChannel] = useState('ALL'); // ALL, RETAIL, WHOLESALE
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [unbrandedOnly, setUnbrandedOnly] = useState(false);

  // Visual Graph settings
  const [graphMode, setGraphMode] = useState('TIME'); // TIME, CATEGORY, BRAND
  const [timeGranularity, setTimeGranularity] = useState('daily'); // daily, weekly, monthly
  const [showProfitCurve, setShowProfitCurve] = useState(true);

  // Best Sellers table search & page
  const [productSearch, setProductSearch] = useState('');
  const [bestSellersPage, setBestSellersPage] = useState(1);
  const pageSize = 10;

  // Load auxiliary data (categories & brands) once on mount
  useEffect(() => {
    let mounted = true;
    Promise.all([fetchCategories(), fetchBrands()])
      .then(([cats, brs]) => {
        if (!mounted) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setBrands(Array.isArray(brs) ? brs : []);
      })
      .catch((err) => {
        console.error('Failed to load filter metadata:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Handle Preset Changes
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === '7D') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30D') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const handleCustomDateChange = (start, end) => {
    setDatePreset('CUSTOM');
    setStartDate(start);
    setEndDate(end);
  };

  const resetAllFilters = () => {
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setChannel('ALL');
    setCategoryId('');
    setBrandId('');
    setUnbrandedOnly(false);
    setProductSearch('');
  };

  // Fetch report summary whenever filters change
  const loadReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (channel && channel !== 'ALL') params.channel = channel;
      if (categoryId) params.categoryId = categoryId;
      if (unbrandedOnly) {
        params.unbrandedOnly = true;
      } else if (brandId) {
        params.brandId = brandId;
      }

      const res = await fetchReportSummary(params);
      setReportData(res);
      setBestSellersPage(1);
    } catch (err) {
      console.error('Failed to load report:', err);
      AlertDialog.fire({
        title: 'Error',
        text: err?.response?.data?.message || err?.message || 'Failed to fetch reporting analytics',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, channel, categoryId, brandId, unbrandedOnly]);

  // Derived KPIs
  const kpis = reportData?.kpis || {
    totalOrders: 0,
    retailOrdersCount: 0,
    wholesaleOrdersCount: 0,
    totalUnitsSold: 0,
    grossRevenue: 0,
    netProductRevenue: 0,
    totalTaxCollected: null,
    totalShippingCollected: null,
    totalCogs: 0,
    grossProfit: 0,
    profitMarginPercent: 0,
    itemsMissingCost: 0,
  };

  // Active time-series data
  const timeSeries = useMemo(() => {
    if (!reportData?.salesOverTime) return [];
    if (timeGranularity === 'weekly') return reportData.salesOverTime.weekly || [];
    if (timeGranularity === 'monthly') return reportData.salesOverTime.monthly || [];
    return reportData.salesOverTime.daily || [];
  }, [reportData, timeGranularity]);

  // Active Filter Badge
  const activeFilterBadge = useMemo(() => {
    const parts = [];
    if (categoryId) {
      const cat = categories.find((c) => String(c.id) === String(categoryId));
      parts.push(`Category: ${cat ? cat.name : categoryId}`);
    }
    if (brandId) {
      const br = brands.find((b) => String(b.id) === String(brandId));
      parts.push(`Brand: ${br ? br.name : brandId}`);
    } else if (unbrandedOnly) {
      parts.push('Brand: Unbranded');
    }
    if (channel !== 'ALL') {
      parts.push(`Channel: ${channel}`);
    }
    return parts.length > 0 ? parts.join(' • ') : null;
  }, [categoryId, brandId, unbrandedOnly, channel, categories, brands]);

  // Filtered Best Sellers
  const filteredBestSellers = useMemo(() => {
    if (!reportData?.bestSellers) return [];
    const q = productSearch.trim().toLowerCase();
    if (!q) return reportData.bestSellers;
    return reportData.bestSellers.filter(
      (item) =>
        item.productName?.toLowerCase().includes(q) ||
        item.categoryName?.toLowerCase().includes(q) ||
        item.brandName?.toLowerCase().includes(q)
    );
  }, [reportData, productSearch]);

  const totalPages = Math.ceil(filteredBestSellers.length / pageSize) || 1;
  const paginatedBestSellers = useMemo(() => {
    const start = (bestSellersPage - 1) * pageSize;
    return filteredBestSellers.slice(start, start + pageSize);
  }, [filteredBestSellers, bestSellersPage]);

  // ── CSV Export Handlers ──
  const handleExportBestSellers = () => {
    const items = reportData?.bestSellers || [];
    const rows = [
      [
        'Rank',
        'Product ID',
        'Product Name',
        'Category',
        'Brand',
        'Units Sold',
        'Avg Selling Price ($)',
        'Unit Cost ($)',
        'Revenue ($)',
        'COGS ($)',
        'Gross Profit ($)',
        'Margin (%)',
      ],
      ...items.map((item, idx) => [
        idx + 1,
        item.productId,
        item.productName,
        item.categoryName,
        item.brandName,
        item.unitsSold,
        Number(item.avgSellingPrice || 0).toFixed(2),
        Number(item.unitCost || 0).toFixed(2),
        Number(item.revenue || 0).toFixed(2),
        Number(item.cogs || 0).toFixed(2),
        Number(item.profit || 0).toFixed(2),
        Number(item.marginPercent || 0).toFixed(2),
      ]),
    ];
    downloadCsv(`Product_Profit_Best_Sellers_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const handleExportSalesOverTime = () => {
    const sot = reportData?.salesOverTime || { daily: [], weekly: [], monthly: [] };
    const rows = [
      ['Granularity', 'Period', 'Orders Count', 'Units Sold', 'Revenue ($)', 'COGS ($)', 'Gross Profit ($)'],
      ...sot.daily.map((d) => [
        'Daily',
        d.periodLabel,
        d.ordersCount,
        d.unitsSold,
        Number(d.revenue || 0).toFixed(2),
        Number(d.cogs || 0).toFixed(2),
        Number(d.profit || 0).toFixed(2),
      ]),
      ...sot.weekly.map((w) => [
        'Weekly',
        w.periodLabel,
        w.ordersCount,
        w.unitsSold,
        Number(w.revenue || 0).toFixed(2),
        Number(w.cogs || 0).toFixed(2),
        Number(w.profit || 0).toFixed(2),
      ]),
      ...sot.monthly.map((m) => [
        'Monthly',
        m.periodLabel,
        m.ordersCount,
        m.unitsSold,
        Number(m.revenue || 0).toFixed(2),
        Number(m.cogs || 0).toFixed(2),
        Number(m.profit || 0).toFixed(2),
      ]),
    ];
    downloadCsv(`Sales_And_Profit_Over_Time_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const handleExportCategoryAndBrand = () => {
    const cats = reportData?.revenueByCategory || [];
    const brs = reportData?.revenueByBrand || [];
    const rows = [
      ['Dimension', 'ID', 'Name', 'Units Sold', 'Revenue ($)', 'COGS ($)', 'Gross Profit ($)', 'Revenue Share (%)'],
      ...cats.map((c) => [
        'Category',
        c.id || 'N/A',
        c.name,
        c.unitsSold,
        Number(c.revenue || 0).toFixed(2),
        Number(c.cogs || 0).toFixed(2),
        Number(c.profit || 0).toFixed(2),
        Number(c.sharePercent || 0).toFixed(2),
      ]),
      ...brs.map((b) => [
        'Brand',
        b.id || 'N/A',
        b.name,
        b.unitsSold,
        Number(b.revenue || 0).toFixed(2),
        Number(b.cogs || 0).toFixed(2),
        Number(b.profit || 0).toFixed(2),
        Number(b.sharePercent || 0).toFixed(2),
      ]),
    ];
    downloadCsv(`Category_And_Brand_Breakdown_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            FINANCIAL INTELLIGENCE &amp; ANALYTICS
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
            Reports &amp; Profit Center
          </h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Settled retail &amp; wholesale revenue, COGS, gross margins, and product profitability.
          </p>
        </div>

        {/* Export & Refresh Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="h-10 px-4 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs font-black uppercase tracking-wider text-neutral-800 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
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
                strokeWidth="2.5"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{loading ? 'Crunching...' : 'Refresh'}</span>
          </button>

          {/* CSV Export Dropdown / Buttons */}
          <div className="relative group">
            <button
              type="button"
              className="h-10 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV / Excel</span>
              <span className="text-[10px] text-neutral-400">▾</span>
            </button>

            <div className="absolute right-0 mt-1 w-64 bg-white border border-neutral-200/90 rounded-2xl shadow-xl py-2 z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="px-3 py-1.5 border-b border-neutral-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Microsoft Excel (UTF-8 BOM)
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportBestSellers}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition-colors flex items-center justify-between"
              >
                <span>Product Profit &amp; Best Sellers</span>
                <span className="text-[10px] font-black text-neutral-400">.csv</span>
              </button>
              <button
                type="button"
                onClick={handleExportSalesOverTime}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition-colors flex items-center justify-between"
              >
                <span>Sales &amp; Profit Over Time</span>
                <span className="text-[10px] font-black text-neutral-400">.csv</span>
              </button>
              <button
                type="button"
                onClick={handleExportCategoryAndBrand}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition-colors flex items-center justify-between"
              >
                <span>Category &amp; Brand Breakdown</span>
                <span className="text-[10px] font-black text-neutral-400">.csv</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-surface space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          {/* Date Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mr-1">
              Date Preset:
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: '7D', label: 'Last 7 Days' },
              { id: '30D', label: 'Last 30 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200/80'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="h-9 px-3 text-xs font-bold rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="h-9 px-3 text-xs font-bold rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Multi-Dimensional Selectors (Channel, Category, Brand) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Channel Filter */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
              Sales Channel
            </label>
            <div className="flex rounded-xl p-1 bg-neutral-100/90 border border-neutral-200/60">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'RETAIL', label: 'Retail' },
                { id: 'WHOLESALE', label: 'Wholesale' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                    channel === c.id
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
              Category Focus
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 focus:outline-none focus:border-neutral-900"
            >
              <option value="">All Categories (Global)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Dropdown */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
              Brand Focus
            </label>
            <select
              value={unbrandedOnly ? '__unbranded__' : brandId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__unbranded__') {
                  setUnbrandedOnly(true);
                  setBrandId('');
                } else {
                  setUnbrandedOnly(false);
                  setBrandId(val);
                }
              }}
              className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 focus:outline-none focus:border-neutral-900"
            >
              <option value="">All Brands (Global)</option>
              <option value="__unbranded__">Unbranded Products Only</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Pills & Reset */}
        {(categoryId || brandId || unbrandedOnly || channel !== 'ALL' || startDate || endDate) && (
          <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Active Filters:</span>
              {channel !== 'ALL' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-neutral-300 bg-neutral-50 text-neutral-800">
                  Channel: {channel}
                </span>
              )}
              {categoryId && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-neutral-300 bg-neutral-50 text-neutral-800">
                  Category: {categories.find((c) => String(c.id) === String(categoryId))?.name || categoryId}
                </span>
              )}
              {brandId && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-neutral-300 bg-neutral-50 text-neutral-800">
                  Brand: {brands.find((b) => String(b.id) === String(brandId))?.name || brandId}
                </span>
              )}
              {unbrandedOnly && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-neutral-300 bg-neutral-50 text-neutral-800">
                  Brand: Unbranded Only
                </span>
              )}
              {(startDate || endDate) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-neutral-300 bg-neutral-50 text-neutral-800">
                  Dates: {startDate || 'Start'} to {endDate || 'Now'}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs font-black uppercase tracking-wider text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Missing-Cost Warning Banner */}
      {Number(kpis?.itemsMissingCost || 0) > 0 && (
        <div className="flex items-start gap-3 p-4 bg-neutral-900 text-white rounded-2xl border border-neutral-800 shadow-surface animate-fadeIn">
          <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-xs">
            <span className="font-bold">
              Note: {kpis.itemsMissingCost} sold line item(s) had $0.00 or missing cost records at the time of sale, which may overstate gross profit and margin.
            </span>
          </div>
        </div>
      )}

      {/* ── 4 Financial & Profit KPI Stat Cards ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Product Revenue */}
        <StatCard
          title="Product Revenue"
          value={loading ? '...' : formatCurrency(kpis.netProductRevenue)}
          subtext={
            kpis.totalTaxCollected == null || categoryId || brandId || unbrandedOnly
              ? 'Tax & Shipping: N/A (Category/Brand Filtered)'
              : `Gross Orders: ${formatCurrency(kpis.grossRevenue)} (Tax: ${formatCurrency(kpis.totalTaxCollected)} • Ship: ${formatCurrency(kpis.totalShippingCollected)})`
          }
          badge="Settled"
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* KPI 2: Total COGS */}
        <StatCard
          title="Cost of Goods (COGS)"
          value={loading ? '...' : formatCurrency(kpis.totalCogs)}
          subtext="FIFO Batch Depletion Cost"
          badge="Inventory"
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />

        {/* KPI 3: Gross Profit */}
        <StatCard
          title="Gross Profit"
          value={loading ? '...' : formatCurrency(kpis.grossProfit)}
          subtext="Net Revenue Minus COGS"
          badge={Number(kpis.grossProfit) >= 0 ? 'Profitable' : 'Loss'}
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />

        {/* KPI 4: Profit Margin % */}
        <StatCard
          title="Profit Margin"
          value={loading ? '...' : formatPercent(kpis.profitMarginPercent)}
          subtext={`${kpis.totalOrders} Orders (${kpis.totalUnitsSold} Units)`}
          badge={`${kpis.retailOrdersCount} Ret / ${kpis.wholesaleOrdersCount} Whs`}
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* ── Visual Graph Card (Dual-Bar Chart in Pure Tailwind/SVG) ──────── */}
      {/* ── Visual Graph Card (Smooth Dual-Axis Spline Chart & Dimensional Breakdowns) ──────── */}
      <div className="space-y-4">
        {/* View Mode & Quick Filter Toolbar */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-surface flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">View Mode:</span>
            <div className="flex rounded-xl p-1 bg-neutral-100 border border-neutral-200/70">
              <button
                type="button"
                onClick={() => setGraphMode('TIME')}
                className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                  graphMode === 'TIME' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Time Series Wave
              </button>
              <button
                type="button"
                onClick={() => setGraphMode('CATEGORY')}
                className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                  graphMode === 'CATEGORY' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                By Category
              </button>
              <button
                type="button"
                onClick={() => setGraphMode('BRAND')}
                className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                  graphMode === 'BRAND' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                By Brand
              </button>
            </div>
          </div>

          {/* Quick-Filter Category and Brand Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mr-1">Quick Select:</span>
            <button
              type="button"
              onClick={() => {
                setCategoryId('');
                setBrandId('');
                setUnbrandedOnly(false);
                setGraphMode('TIME');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !categoryId && !brandId && !unbrandedOnly
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All
            </button>
            {categories.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId(String(c.id));
                  setGraphMode('TIME');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  String(categoryId) === String(c.id)
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {c.name}
              </button>
            ))}
            {brands.slice(0, 4).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBrandId(String(b.id));
                  setUnbrandedOnly(false);
                  setGraphMode('TIME');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  String(brandId) === String(b.id)
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Visual Graph: Pure React/SVG Smooth Spline Area Chart */}
        {graphMode === 'TIME' ? (
          <SmoothSalesTrendChart
            data={timeSeries}
            granularity={timeGranularity}
            onGranularityChange={setTimeGranularity}
            granularityOptions={['daily', 'weekly', 'monthly']}
            startDate={startDate}
            endDate={endDate}
            title={
              timeGranularity === 'daily'
                ? 'Daily Sales & Revenue Trend'
                : timeGranularity === 'weekly'
                ? 'Weekly Sales & Revenue Trend'
                : 'Monthly Sales & Revenue Trend'
            }
            subtitle="Smooth Catmull-Rom cubic bezier spline wave comparing Sales Revenue ($) against Orders volume"
            activeFilterBadge={activeFilterBadge}
            onClearFilter={resetAllFilters}
            showProfitCurve={showProfitCurve}
            onToggleProfit={() => setShowProfitCurve((prev) => !prev)}
            height={320}
          />
        ) : (
          /* Dimensional Breakdown Cards (Category or Brand) with instant click-to-filter wave */
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
                  {graphMode === 'CATEGORY' ? 'Revenue & Profit by Category' : 'Revenue & Profit by Brand'}
                </h2>
                <p className="text-xs font-bold text-neutral-400 mt-0.5">
                  Click any bar below to immediately filter the smooth sales spline wave for that specific dimension.
                </p>
              </div>
              {activeFilterBadge && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-900 text-white shadow-sm">
                    <span>{activeFilterBadge}</span>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="hover:text-neutral-300 ml-1 font-bold text-sm leading-none cursor-pointer"
                      title="Clear filter"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs font-bold text-neutral-600">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-neutral-900 inline-block" />
                <span>Product Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-neutral-400 border border-neutral-500 inline-block" />
                <span>Cost of Goods (COGS)</span>
              </div>
            </div>

            {/* Dimensional Bars Canvas */}
            <div className="relative border border-neutral-200/80 rounded-2xl p-4 bg-[#FAFBFD] overflow-x-auto min-h-[260px] flex items-end">
              {loading ? (
                <div className="w-full h-56 flex flex-col items-center justify-center text-neutral-400">
                  <span className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">Generating breakdown...</p>
                </div>
              ) : graphMode === 'CATEGORY' ? (
                (reportData?.revenueByCategory || []).length === 0 ? (
                  <div className="w-full h-56 flex flex-col items-center justify-center text-neutral-400 text-xs font-bold">
                    No category sales recorded.
                  </div>
                ) : (
                  <div className="w-full flex items-end gap-4 min-w-[500px] h-64 pt-6 px-2">
                    {(reportData?.revenueByCategory || []).map((cat) => {
                      const maxCatVal = Math.max(
                        ...(reportData?.revenueByCategory || []).map((c) => Math.max(Number(c.revenue || 0), Number(c.cogs || 0))),
                        1
                      );
                      const revHeight = Math.max(4, Math.round((Number(cat.revenue || 0) / maxCatVal) * 100));
                      const cogsHeight = Math.max(4, Math.round((Number(cat.cogs || 0) / maxCatVal) * 100));

                      return (
                        <div
                          key={cat.id || cat.name}
                          onClick={() => {
                            setCategoryId(cat.id ? String(cat.id) : '');
                            setGraphMode('TIME');
                          }}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                          title="Click to view Sales Spline wave for this Category"
                        >
                          <div className="w-full flex items-end justify-center gap-1.5 h-full">
                            <div
                              style={{ height: `${revHeight}%` }}
                              className="w-full max-w-[24px] bg-neutral-900 group-hover:bg-neutral-800 rounded-t transition-all"
                            />
                            <div
                              style={{ height: `${cogsHeight}%` }}
                              className="w-full max-w-[24px] bg-neutral-400 group-hover:bg-neutral-500 rounded-t transition-all"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-neutral-700 mt-2 truncate max-w-[64px] text-center">
                            {cat.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                (reportData?.revenueByBrand || []).length === 0 ? (
                  <div className="w-full h-56 flex flex-col items-center justify-center text-neutral-400 text-xs font-bold">
                    No brand sales recorded.
                  </div>
                ) : (
                  <div className="w-full flex items-end gap-4 min-w-[500px] h-64 pt-6 px-2">
                    {(reportData?.revenueByBrand || []).map((b) => {
                      const maxBrVal = Math.max(
                        ...(reportData?.revenueByBrand || []).map((br) => Math.max(Number(br.revenue || 0), Number(br.cogs || 0))),
                        1
                      );
                      const revHeight = Math.max(4, Math.round((Number(b.revenue || 0) / maxBrVal) * 100));
                      const cogsHeight = Math.max(4, Math.round((Number(b.cogs || 0) / maxBrVal) * 100));

                      return (
                        <div
                          key={b.id || b.name}
                          onClick={() => {
                            if (b.name === 'Unbranded') {
                              setUnbrandedOnly(true);
                              setBrandId('');
                            } else if (b.id) {
                              setUnbrandedOnly(false);
                              setBrandId(String(b.id));
                            }
                            setGraphMode('TIME');
                          }}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                          title="Click to view Sales Spline wave for this Brand"
                        >
                          <div className="w-full flex items-end justify-center gap-1.5 h-full">
                            <div
                              style={{ height: `${revHeight}%` }}
                              className="w-full max-w-[24px] bg-neutral-900 group-hover:bg-neutral-800 rounded-t transition-all"
                            />
                            <div
                              style={{ height: `${cogsHeight}%` }}
                              className="w-full max-w-[24px] bg-neutral-400 group-hover:bg-neutral-500 rounded-t transition-all"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-neutral-700 mt-2 truncate max-w-[64px] text-center">
                            {b.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>



      {/* ── Best Sellers & Product Profit Table ────────────────────────────── */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Product Profitability &amp; Best Sellers
            </h2>
            <p className="text-xs font-bold text-neutral-400 mt-0.5">
              Individual product revenue, unit costs, and realized gross profit margins
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search product, category, brand..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setBestSellersPage(1);
              }}
              className="h-10 px-3.5 text-xs font-bold bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 w-64"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#FAFBFD] border-b border-neutral-200 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Brand</th>
                <th className="py-3 px-3 text-right">Units Sold</th>
                <th className="py-3 px-3 text-right">Avg Price</th>
                <th className="py-3 px-3 text-right">Unit Cost</th>
                <th className="py-3 px-3 text-right">Revenue</th>
                <th className="py-3 px-3 text-right">COGS</th>
                <th className="py-3 px-3 text-right">Profit</th>
                <th className="py-3 px-3 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-400">
                    <span className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin inline-block mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider">Loading best sellers...</p>
                  </td>
                </tr>
              ) : paginatedBestSellers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-400 font-bold">
                    No products matched the current report criteria.
                  </td>
                </tr>
              ) : (
                paginatedBestSellers.map((item, idx) => {
                  const rank = (bestSellersPage - 1) * pageSize + idx + 1;
                  const isLoss = Number(item.profit || 0) < 0;

                  return (
                    <tr key={item.productId} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-3 font-black text-neutral-400">{rank}</td>
                      <td className="py-3 px-3 font-bold text-neutral-900 max-w-[200px] truncate">
                        {item.productName}
                      </td>
                      <td className="py-3 px-3 text-neutral-600">{item.categoryName || '—'}</td>
                      <td className="py-3 px-3 text-neutral-600">{item.brandName || 'Unbranded'}</td>
                      <td className="py-3 px-3 text-right font-black text-neutral-900">{item.unitsSold}</td>
                      <td className="py-3 px-3 text-right font-bold text-neutral-700">
                        {formatCurrency(item.avgSellingPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-neutral-700">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-neutral-900">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="py-3 px-3 text-right text-neutral-600">{formatCurrency(item.cogs)}</td>
                      <td
                        className={`py-3 px-3 text-right font-black ${
                          isLoss ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(item.profit)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isLoss ? (
                          <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-rose-300 text-rose-700 bg-rose-50">
                            LOSS ({formatPercent(item.marginPercent)})
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-neutral-200 text-neutral-800 bg-neutral-50">
                            {formatPercent(item.marginPercent)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 pt-2">
            <span>
              Showing {(bestSellersPage - 1) * pageSize + 1}–
              {Math.min(bestSellersPage * pageSize, filteredBestSellers.length)} of{' '}
              {filteredBestSellers.length} products
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBestSellersPage((p) => Math.max(1, p - 1))}
                disabled={bestSellersPage === 1}
                className="px-3 py-1 border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2">
                Page {bestSellersPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setBestSellersPage((p) => Math.min(totalPages, p + 1))}
                disabled={bestSellersPage === totalPages}
                className="px-3 py-1 border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Side-by-Side Category & Brand Leaderboards ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Leaderboard */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-surface space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-neutral-900">
                Revenue by Category
              </h3>
              <p className="text-xs font-bold text-neutral-400 mt-0.5">
                Top performing merchandise departments
              </p>
            </div>
            {categoryId && (
              <button
                type="button"
                onClick={() => setCategoryId('')}
                className="text-[11px] font-black uppercase tracking-wider text-neutral-500 hover:text-neutral-900 underline"
              >
                Clear Category
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(reportData?.revenueByCategory || []).length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center font-bold">No categories recorded.</p>
            ) : (
              (reportData?.revenueByCategory || []).map((cat) => (
                <div
                  key={cat.id || cat.name}
                  onClick={() => setCategoryId(cat.id ? String(cat.id) : '')}
                  className="p-3 rounded-2xl border border-neutral-100 hover:border-neutral-300 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-neutral-900 group-hover:underline">{cat.name}</span>
                    <span className="font-black text-neutral-900">{formatCurrency(cat.revenue)}</span>
                  </div>
                  {/* Share Progress Bar */}
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${Math.min(100, Number(cat.sharePercent || 0))}%` }}
                      className="bg-neutral-900 h-full rounded-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 mt-1">
                    <span>{cat.unitsSold} units sold</span>
                    <span>{formatPercent(cat.sharePercent)} share</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Brand Leaderboard */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-surface space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-neutral-900">
                Revenue by Brand
              </h3>
              <p className="text-xs font-bold text-neutral-400 mt-0.5">
                Brand sales distribution &amp; margins
              </p>
            </div>
            {(brandId || unbrandedOnly) && (
              <button
                type="button"
                onClick={() => {
                  setBrandId('');
                  setUnbrandedOnly(false);
                }}
                className="text-[11px] font-black uppercase tracking-wider text-neutral-500 hover:text-neutral-900 underline"
              >
                Clear Brand
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(reportData?.revenueByBrand || []).length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center font-bold">No brands recorded.</p>
            ) : (
              (reportData?.revenueByBrand || []).map((b) => (
                <div
                  key={b.id || b.name}
                  onClick={() => {
                    if (b.name === 'Unbranded') {
                      setUnbrandedOnly(true);
                      setBrandId('');
                    } else if (b.id) {
                      setUnbrandedOnly(false);
                      setBrandId(String(b.id));
                    }
                  }}
                  className="p-3 rounded-2xl border border-neutral-100 hover:border-neutral-300 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-neutral-900 group-hover:underline">{b.name}</span>
                    <span className="font-black text-neutral-900">{formatCurrency(b.revenue)}</span>
                  </div>
                  {/* Share Progress Bar */}
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${Math.min(100, Number(b.sharePercent || 0))}%` }}
                      className="bg-neutral-900 h-full rounded-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 mt-1">
                    <span>{b.unitsSold} units sold</span>
                    <span>{formatPercent(b.sharePercent)} share</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
