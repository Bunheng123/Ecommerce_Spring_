import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { fetchAdminProducts, fetchCategories } from '../../api/products';

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchAdminProducts(), fetchCategories()])
      .then(([prodRes, catRes]) => {
        if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
          setProducts(prodRes.value);
        }
        if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) {
          setCategories(catRes.value);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.reorderLevel != null && p.stock <= p.reorderLevel
  ).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section with thick font */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            EXECUTIVE OVERVIEW
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
            Operations Dashboard
          </h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Real-time telemetry, inventory levels, and stock movements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="h-11 px-5 rounded-2xl bg-neutral-950 text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-md shadow-neutral-900/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Manage Products</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid with rounded-2xl and chunky numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total SKUs"
          value={String(products.length).padStart(2, '0')}
          subtext="Catalogued pieces"
          badge="Live DB"
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          title="Warehouse Stock"
          value={String(totalStockUnits)}
          subtext="Available units"
          trend="+12%"
          trendUp={true}
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          }
        />
        <StatCard
          title="Categories"
          value={String(categories.length || 1).padStart(2, '0')}
          subtext="Department partitions"
          badge="Active"
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />
        <Link to="/admin/low-stock" className="block transition-transform hover:-translate-y-0.5">
          <StatCard
            title="Low Stock Alerts"
            value={String(lowStockCount)}
            subtext="Under reorder threshold"
            trend={lowStockCount > 0 ? 'Action Req.' : 'Nominal'}
            trendUp={lowStockCount === 0}
            icon={
              <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </Link>
      </div>

      {/* Live Inventory Preview Table (rounded-3xl, thick fonts) */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface">
        <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">
              Live Inventory Snapshot
            </h2>
            <p className="text-xs font-bold text-neutral-400 mt-0.5">
              Direct telemetry from Spring Boot backend database
            </p>
          </div>

          <Link
            to="/admin/products"
            className="text-xs font-black uppercase tracking-wider text-neutral-900 hover:text-neutral-600 flex items-center gap-1.5"
          >
            <span>View All ({products.length})</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                <th className="py-4 px-4">Artifact</th>
                <th className="py-4 px-4">Department</th>
                <th className="py-4 px-4">Unit Price</th>
                <th className="py-4 px-4">Stock Level</th>
                <th className="py-4 px-4">Threshold</th>
                <th className="py-4 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {products.slice(0, 6).map((p) => {
                const isLow = p.stock > 0 && p.reorderLevel != null && p.stock <= p.reorderLevel;
                const isOut = (p.stock ?? 0) <= 0;
                return (
                  <tr key={p.id} className="hover:bg-[#F9FAFC] transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center p-1 shrink-0">
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
                          <span className="text-[10px] font-mono text-neutral-400 uppercase">
                            SKU-{p.id} &bull; {p.publicId || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-black text-xs uppercase px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {p.categoryName || 'GENERAL'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-sm text-neutral-900">
                      ${Number(p.price || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-extrabold text-neutral-900 text-sm">
                        {p.stock ?? 0}
                      </span>
                      <span className="text-neutral-400 font-bold ml-1">units</span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-neutral-500">
                      {p.reorderLevel ?? 0} units
                    </td>
                    <td className="py-4 px-4 text-right">
                      <StatusBadge
                        status={
                          isOut ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK'
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
