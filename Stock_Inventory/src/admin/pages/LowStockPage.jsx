import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { fetchAdminProducts, fetchCategories } from '../../api/products';
import { openStockMovementDialog } from '../utils/stockMovementDialog';
import { getApiErrorMessage } from '../../api/stockMovements';

const PAGE_SIZE = 10;

export default function LowStockPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALERT_ONLY'); // 'ALERT_ONLY', 'OUT_OF_STOCK', 'LOW_STOCK', 'ALL'
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const [productRes, categoryRes] = await Promise.all([
        fetchAdminProducts(),
        fetchCategories(),
      ]);
      setProducts(Array.isArray(productRes) ? productRes : []);
      setCategories(Array.isArray(categoryRes) ? categoryRes : []);
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Failed to fetch inventory telemetry'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics across all products
  const metrics = useMemo(() => {
    const total = products.length;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let totalDeficit = 0;

    products.forEach((p) => {
      const stock = p.stock ?? 0;
      const threshold = p.reorderLevel ?? 10;
      if (stock <= 0) {
        outOfStockCount += 1;
        totalDeficit += threshold;
      } else if (stock <= threshold) {
        lowStockCount += 1;
        totalDeficit += (threshold - stock);
      }
    });

    const totalAlerts = outOfStockCount + lowStockCount;
    const healthRate = total > 0 ? Math.round(((total - totalAlerts) / total) * 100) : 100;

    return {
      total,
      outOfStockCount,
      lowStockCount,
      totalAlerts,
      totalDeficit,
      healthRate,
    };
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((p) => {
      const stock = p.stock ?? 0;
      const threshold = p.reorderLevel ?? 10;
      const isOut = stock <= 0;
      const isLow = stock > 0 && stock <= threshold;

      // Status Filter
      if (statusFilter === 'ALERT_ONLY' && !isOut && !isLow) return false;
      if (statusFilter === 'OUT_OF_STOCK' && !isOut) return false;
      if (statusFilter === 'LOW_STOCK' && !isLow) return false;

      // Category Filter
      if (categoryFilter !== 'ALL') {
        const catId = p.categoryId ?? p.category?.id;
        if (String(catId) !== String(categoryFilter)) return false;
      }

      // Search Query
      if (q) {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const catMatch = (p.categoryName || '').toLowerCase().includes(q);
        const skuMatch = `sku-${p.id}`.toLowerCase().includes(q);
        if (!nameMatch && !catMatch && !skuMatch) return false;
      }

      return true;
    });
  }, [products, search, categoryFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  // Handle instant restock
  const handleRestock = (product) => {
    openStockMovementDialog({
      mode: 'STOCK_IN',
      product,
      products,
      onSuccess: () => {
        // Immediate refresh of inventory data
        loadData();
      },
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section with high-contrast typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
              INVENTORY HEALTH & AUTOMATION
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
            Low Stock Alerts
          </h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Real-time replenishment monitoring, depleted stock detection, and instant restock operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="h-11 px-4 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh inventory levels"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              openStockMovementDialog({
                mode: 'STOCK_IN',
                products,
                onSuccess: () => loadData(),
              });
            }}
            className="h-11 px-5 rounded-2xl bg-neutral-950 text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-md shadow-neutral-900/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Quick Stock In</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Critical Depletion"
          value={String(metrics.outOfStockCount).padStart(2, '0')}
          subtext="0 units available in stock"
          trend={metrics.outOfStockCount > 0 ? 'Urgent Action' : 'Zero Depleted'}
          trendUp={metrics.outOfStockCount === 0}
          icon={
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <StatCard
          title="Threshold Warning"
          value={String(metrics.lowStockCount).padStart(2, '0')}
          subtext="At or below reorder level"
          trend={metrics.lowStockCount > 0 ? 'Restock Advised' : 'Optimal'}
          trendUp={metrics.lowStockCount === 0}
          icon={
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Replenishment Deficit"
          value={String(metrics.totalDeficit)}
          subtext="Units required for safety stock"
          badge="Shortage"
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          }
        />

        <StatCard
          title="Catalog Health"
          value={`${metrics.healthRate}%`}
          subtext="Inventory within safe margins"
          trend={metrics.healthRate >= 80 ? 'Healthy' : 'Attention'}
          trendUp={metrics.healthRate >= 80}
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface space-y-6">
        {/* Controls & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100/80 rounded-2xl border border-neutral-200/70 overflow-x-auto">
            <button
              type="button"
              onClick={() => { setStatusFilter('ALERT_ONLY'); setPage(1); }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALERT_ONLY'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              All Alerts ({metrics.totalAlerts})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('OUT_OF_STOCK'); setPage(1); }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'OUT_OF_STOCK'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Out of Stock ({metrics.outOfStockCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('LOW_STOCK'); setPage(1); }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'LOW_STOCK'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Low Stock ({metrics.lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setPage(1); }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Full Inventory ({metrics.total})
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search SKU or name..."
                className="w-full bg-[#F5F6FA] border border-neutral-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:bg-white transition-all"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 text-xs font-bold uppercase tracking-wider bg-[#F5F6FA] border border-neutral-200/80 rounded-xl text-neutral-800 outline-none focus:border-neutral-900 transition-all cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center justify-between">
            <span>⚠ {errorMessage}</span>
            <button
              type="button"
              onClick={loadData}
              className="text-red-900 underline hover:no-underline font-black cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                <th className="py-4 px-4 whitespace-nowrap">Artifact</th>
                <th className="py-4 px-4 whitespace-nowrap">Department</th>
                <th className="py-4 px-4 whitespace-nowrap">Current Stock</th>
                <th className="py-4 px-4 whitespace-nowrap">Threshold</th>
                <th className="py-4 px-4 whitespace-nowrap">Deficit</th>
                <th className="py-4 px-4 whitespace-nowrap">Stock Health</th>
                <th className="py-4 px-4 text-center whitespace-nowrap">Status</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">Quick Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-neutral-400 font-bold">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-neutral-900 border-t-transparent rounded-full mb-2" />
                    <p>Loading inventory telemetry...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto text-xl font-black">
                        ✓
                      </div>
                      <h3 className="text-sm font-black text-neutral-900 uppercase tracking-tight">
                        No Low Stock Warnings
                      </h3>
                      <p className="text-xs text-neutral-500 font-medium">
                        {statusFilter === 'ALERT_ONLY'
                          ? 'All catalogued products are currently operating above their configured reorder thresholds.'
                          : 'No inventory items match the current search or category filter criteria.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setStatusFilter('ALL'); setSearch(''); setCategoryFilter('ALL'); }}
                        className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-800 transition-all cursor-pointer"
                      >
                        View Full Inventory
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((p) => {
                  const stock = p.stock ?? 0;
                  const threshold = p.reorderLevel ?? 10;
                  const isOut = stock <= 0;
                  const isLow = stock > 0 && stock <= threshold;
                  const deficit = Math.max(0, threshold - stock);
                  const safeMax = Math.max(threshold * 2, stock, 20);
                  const healthPercent = Math.min(100, Math.round((stock / safeMax) * 100));

                  return (
                    <tr key={p.id} className="hover:bg-[#F9FAFC] transition-colors group">
                      {/* Product details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center p-1 shrink-0">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-neutral-400">SI</span>
                            )}
                          </div>
                          <div>
                            <span className="font-black text-sm text-neutral-900 block tracking-tight line-clamp-1">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-neutral-400 uppercase">
                                SKU-{p.id}
                              </span>
                              <span className="text-neutral-300">&bull;</span>
                              <span className="text-[10px] font-mono text-neutral-500 font-bold">
                                ${Number(p.price || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-black text-[11px] uppercase px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 border border-neutral-200 whitespace-nowrap">
                          {p.categoryName || 'GENERAL'}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-baseline gap-1 whitespace-nowrap">
                          <span
                            className={`font-black text-base ${
                              isOut
                                ? 'text-red-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-neutral-900'
                            }`}
                          >
                            {stock}
                          </span>
                          <span className="text-neutral-400 text-[11px] font-bold">units</span>
                        </div>
                      </td>

                      {/* Reorder Threshold */}
                      <td className="py-4 px-4 font-mono font-bold text-neutral-600 whitespace-nowrap">
                        {threshold} units
                      </td>

                      {/* Deficit */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {deficit > 0 ? (
                          <span className="font-mono font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 text-xs whitespace-nowrap">
                            -{deficit} units
                          </span>
                        ) : (
                          <span className="font-mono text-neutral-400 text-xs font-bold whitespace-nowrap">
                            +0 (Safe)
                          </span>
                        )}
                      </td>

                      {/* Stock Health Bar */}
                      <td className="py-4 px-4 min-w-[130px] whitespace-nowrap">
                        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden border border-neutral-200/60">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              isOut
                                ? 'bg-red-600'
                                : isLow
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(4, healthPercent)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-neutral-400 font-bold mt-1 whitespace-nowrap">
                          <span>0</span>
                          <span>{threshold}</span>
                          <span>{safeMax}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <StatusBadge
                          status={
                            isOut
                              ? 'OUT_OF_STOCK'
                              : isLow
                              ? 'LOW_STOCK'
                              : 'IN_STOCK'
                          }
                        />
                      </td>

                      {/* Quick Restock Action Button */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleRestock(p)}
                          className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1.5 ml-auto cursor-pointer whitespace-nowrap"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Stock In</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <span className="text-xs font-bold text-neutral-500">
              Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(page * PAGE_SIZE, filteredProducts.length)} of{' '}
              {filteredProducts.length} items
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-black text-neutral-900 px-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Helpful Quick Links footer */}
      <div className="flex items-center justify-between p-6 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-xs">
        <div className="flex items-center gap-3">
          <span className="h-8 w-8 rounded-xl bg-white border border-neutral-200 text-neutral-700 flex items-center justify-center font-bold">
            ℹ
          </span>
          <div>
            <h4 className="font-extrabold text-neutral-900 uppercase tracking-tight">
              Automated Reorder Thresholds
            </h4>
            <p className="text-neutral-500 font-medium">
              Products automatically trigger warnings when available stock falls at or below their customized reorder level.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded-xl font-bold uppercase tracking-wider text-[11px] text-neutral-900 transition-colors"
          >
            Adjust Thresholds in Products &rarr;
          </Link>
          <Link
            to="/admin/stock-movements"
            className="px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded-xl font-bold uppercase tracking-wider text-[11px] text-neutral-900 transition-colors"
          >
            Stock Movement Ledger &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
