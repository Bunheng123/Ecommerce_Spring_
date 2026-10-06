import { useEffect, useMemo, useState } from 'react';
import { fetchAdminProducts } from '../../api/products';
import { fetchStockMovements, getApiErrorMessage } from '../../api/stockMovements';
import { openStockMovementDialog } from '../utils/stockMovementDialog';

const PAGE_SIZE = 10;

const TYPE_LABELS = {
  STOCK_IN: 'Stock In',
  STOCK_OUT: 'Stock Out',
  ADJUSTMENT: 'Adjustment',
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeMovement(movement) {
  const product = movement.product || {};
  const user = movement.user || {};

  return {
    id: movement.id,
    createdAt: movement.createdAt || movement.date || movement.timestamp,
    productId: movement.productId ?? product.id,
    productName: movement.productName || product.name || `Product #${movement.productId ?? product.id ?? '—'}`,
    type: movement.type || movement.movementType || 'ADJUSTMENT',
    quantity: movement.quantity ?? 0,
    previousStock: movement.previousStock ?? movement.beforeStock ?? '—',
    newStock: movement.newStock ?? movement.afterStock ?? '—',
    reason: movement.reason || '—',
    userName: movement.userName || user.username || user.email || 'System',
  };
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [productFilter, setProductFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');

    const [productResult, movementResult] = await Promise.allSettled([
      fetchAdminProducts(),
      fetchStockMovements(),
    ]);

    if (productResult.status === 'fulfilled' && Array.isArray(productResult.value)) {
      setProducts(productResult.value);
    }

    if (movementResult.status === 'fulfilled') {
      setMovements(Array.isArray(movementResult.value) ? movementResult.value : []);
    } else {
      setMovements([]);
      setErrorMessage(getApiErrorMessage(movementResult.reason, 'Unable to load stock movements'));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const normalizedMovements = useMemo(
    () => movements.map(normalizeMovement),
    [movements]
  );

  const filteredMovements = useMemo(() => {
    return normalizedMovements.filter((movement) => {
      const matchesProduct =
        productFilter === 'ALL' || String(movement.productId) === String(productFilter);
      const matchesType = typeFilter === 'ALL' || movement.type === typeFilter;
      return matchesProduct && matchesType;
    });
  }, [normalizedMovements, productFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredMovements.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filteredMovements.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const handleLogMovement = () => {
    openStockMovementDialog({
      products,
      onSuccess: loadData,
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            INVENTORY AUDIT
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
            Stock Movements
          </h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Read-only inventory ledger with manual stock-in and stock-out logging.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogMovement}
          className="h-12 px-6 rounded-2xl bg-neutral-950 text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-md shadow-neutral-900/10 self-start sm:self-auto cursor-pointer"
        >
          Log Movement
        </button>
      </div>

      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Audit Trail
            </h2>
            <span className="text-xs font-black bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full border border-neutral-200">
              {filteredMovements.length} Entries
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
            <select
              value={productFilter}
              onChange={handleFilterChange(setProductFilter)}
              className="h-10 min-w-64 bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3 outline-none focus:border-neutral-900 focus:bg-white transition-all"
            >
              <option value="ALL">All Products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={handleFilterChange(setTypeFilter)}
              className="h-10 min-w-52 bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3 outline-none focus:border-neutral-900 focus:bg-white transition-all"
            >
              <option value="ALL">All Types</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
            {errorMessage}
          </div>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full min-w-[880px] text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                <th className="py-4 px-4 whitespace-nowrap">Date</th>
                <th className="py-4 px-4 whitespace-nowrap">Product</th>
                <th className="py-4 px-4 whitespace-nowrap">Type</th>
                <th className="py-4 px-4 whitespace-nowrap">Quantity</th>
                <th className="py-4 px-4 whitespace-nowrap">Previous Stock</th>
                <th className="py-4 px-4 whitespace-nowrap">New Stock</th>
                <th className="py-4 px-4 whitespace-nowrap">Reason</th>
                <th className="py-4 px-4 whitespace-nowrap">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400 whitespace-nowrap">
                    <p className="text-xs font-bold uppercase tracking-wider">Loading stock movements...</p>
                  </td>
                </tr>
              ) : pageItems.length > 0 ? (
                pageItems.map((movement) => (
                  <tr key={movement.id} className="hover:bg-[#F9FAFC] transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-neutral-500 whitespace-nowrap">
                      {formatDate(movement.createdAt)}
                    </td>
                    <td className="py-4 px-4 font-black text-neutral-900 whitespace-nowrap">
                      {movement.productName}
                    </td>
                    <td className="py-4 px-4 font-black text-neutral-800 whitespace-nowrap">
                      {TYPE_LABELS[movement.type] || movement.type}
                    </td>
                    <td className="py-4 px-4 font-black text-neutral-900 whitespace-nowrap">
                      {movement.quantity}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-neutral-500 whitespace-nowrap">
                      {movement.previousStock}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-neutral-900 whitespace-nowrap">
                      {movement.newStock}
                    </td>
                    <td className="py-4 px-4 max-w-xs whitespace-nowrap">
                      <span className="truncate max-w-[240px] block font-bold text-neutral-600" title={movement.reason}>
                        {movement.reason}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-neutral-600 whitespace-nowrap">
                      {movement.userName}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <p className="text-xs font-bold uppercase tracking-wider">
                      No stock movements found
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 mt-4 border-t border-neutral-100">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Page {safePage} of {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-9 px-4 rounded-xl border border-neutral-200 bg-white text-[11px] font-black uppercase text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="h-9 px-4 rounded-xl border border-neutral-200 bg-white text-[11px] font-black uppercase text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
