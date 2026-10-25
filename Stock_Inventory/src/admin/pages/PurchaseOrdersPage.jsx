import { useState, useEffect, useCallback, useMemo } from 'react';
import PurchaseOrderForm from '../components/PurchaseOrderForm';
import { Toast, ConfirmDialog, AlertDialog } from '../utils/swalConfig';
import {
  getAllPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../../api/purchaseOrders';
import { getAllSuppliers } from '../../api/suppliers';
import { fetchAdminProducts } from '../../api/products';

const PAGE_SIZE = 10;
const STATUS_FILTERS = ['ALL', 'PENDING', 'RECEIVED', 'CANCELLED'];

function getBackendErrorMessage(err, fallback = 'Operation failed') {
  if (err?.response?.data?.validationErrors) {
    const errors = Object.values(err.response.data.validationErrors);
    if (errors.length > 0) return errors[0];
  }
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

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State: ONLY 'create' | 'view' (NO edit flow!)
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'view'
    purchaseOrder: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pos, sups, prods] = await Promise.all([
        getAllPurchaseOrders(),
        getAllSuppliers().catch(() => []),
        fetchAdminProducts().catch(() => []),
      ]);
      setPurchaseOrders(Array.isArray(pos) ? pos : []);
      setSuppliers(Array.isArray(sups) ? sups : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      console.error('Failed to load purchase orders data:', err);
      const msg = getBackendErrorMessage(err, 'Failed to fetch purchase orders');
      AlertDialog.fire({ title: 'Load Failed', text: msg });
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getAllPurchaseOrders(),
      getAllSuppliers().catch(() => []),
      fetchAdminProducts().catch(() => []),
    ])
      .then(([pos, sups, prods]) => {
        if (isMounted) {
          setPurchaseOrders(Array.isArray(pos) ? pos : []);
          setSuppliers(Array.isArray(sups) ? sups : []);
          setProducts(Array.isArray(prods) ? prods : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load purchase orders data:', err);
          const msg = getBackendErrorMessage(err, 'Failed to fetch purchase orders');
          AlertDialog.fire({ title: 'Load Failed', text: msg });
          setPurchaseOrders([]);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Modal Handlers
  const handleOpenCreate = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
      purchaseOrder: null,
    });
  };

  const handleOpenView = (po) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      purchaseOrder: po,
    });
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setModalState({
      isOpen: false,
      mode: 'create',
      purchaseOrder: null,
    });
  };

  // Create PO Handler
  const handleCreateSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await createPurchaseOrder(formData);
      Toast.fire({ title: 'Purchase order issued successfully' });
      handleCloseModal();
      loadData();
    } catch (err) {
      console.error('Failed to create purchase order:', err);
      const msg = getBackendErrorMessage(err, 'Failed to create purchase order');
      AlertDialog.fire({ title: 'Creation Failed', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receive PO Handler
  const handleReceive = async (po) => {
    const result = await ConfirmDialog.fire({
      title: 'Receive Purchase Order?',
      text: `Receive PO #${po.id}? This will immediately increase stock for all items and log stock-in movements.`,
      confirmButtonText: 'Receive Stock',
    });

    if (result.isConfirmed) {
      try {
        await receivePurchaseOrder(po.id);
        Toast.fire({ title: `PO #${po.id} received and stock updated` });
        loadData();
      } catch (err) {
        console.error('Failed to receive purchase order:', err);
        const msg = getBackendErrorMessage(err, 'Failed to receive purchase order');
        AlertDialog.fire({ title: 'Receipt Failed', text: msg });
      }
    }
  };

  // Cancel PO Handler
  const handleCancelOrder = async (po) => {
    const result = await ConfirmDialog.fire({
      title: 'Cancel Purchase Order?',
      text: `Cancel PO #${po.id}? The order status will become CANCELLED with no stock modifications.`,
      confirmButtonText: 'Cancel Order',
    });

    if (result.isConfirmed) {
      try {
        await cancelPurchaseOrder(po.id);
        Toast.fire({ title: `PO #${po.id} cancelled` });
        loadData();
      } catch (err) {
        console.error('Failed to cancel purchase order:', err);
        const msg = getBackendErrorMessage(err, 'Failed to cancel purchase order');
        AlertDialog.fire({ title: 'Cancellation Failed', text: msg });
      }
    }
  };

  // Filtered & Paginated Purchase Orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      // Status filter
      const poStatus = String(po.status || 'PENDING').toUpperCase();
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'RECEIVED' && poStatus !== 'RECEIVED' && poStatus !== 'COMPLETED') {
          return false;
        }
        if (selectedStatus !== 'RECEIVED' && poStatus !== selectedStatus) {
          return false;
        }
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const poId = String(po.id || '');
      const supplierName = String(po.supplierName || '').toLowerCase();
      const createdBy = String(po.createdByUsername || '').toLowerCase();

      return poId.includes(q) || supplierName.includes(q) || createdBy.includes(q);
    });
  }, [purchaseOrders, selectedStatus, searchQuery]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, activePage]);

  // Statistics
  const totalCount = purchaseOrders.length;
  const pendingCount = purchaseOrders.filter((po) => String(po.status).toUpperCase() === 'PENDING').length;
  const receivedCount = purchaseOrders.filter(
    (po) => String(po.status).toUpperCase() === 'RECEIVED' || String(po.status).toUpperCase() === 'COMPLETED'
  ).length;
  const totalSpend = purchaseOrders
    .filter((po) => String(po.status).toUpperCase() === 'RECEIVED' || String(po.status).toUpperCase() === 'COMPLETED')
    .reduce((acc, po) => acc + (Number(po.totalCost) || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            SUPPLY CHAIN
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
            Purchase Orders
          </h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Issue restock orders, receive inventory inbound, and audit procurement history.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="h-12 px-6 rounded-2xl bg-neutral-950 text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-md shadow-neutral-900/10 flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <span>+</span>
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* KPI Stat Cards (using shadow-surface) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Total Purchase Orders
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {totalCount}
            </span>
            <span className="text-[10px] font-bold text-neutral-400 font-mono">
              ALL TIME
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Pending Delivery
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {pendingCount}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border border-neutral-300 text-neutral-800 bg-white">
              PENDING
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Received & In Stock
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {receivedCount}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border border-neutral-300 text-neutral-800 bg-white">
              RECEIVED
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Total Received Spend
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              ${totalSpend.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-neutral-400 font-mono">
              USD
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card (using shadow-surface) */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-surface overflow-hidden flex flex-col">
        {/* Search & Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-neutral-50/50">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {STATUS_FILTERS.map((status) => {
              const isSelected = selectedStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(status);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by PO #, supplier, user..."
              className="w-full text-xs font-bold rounded-xl px-3.5 py-2 pl-9 bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-900 outline-none transition-all"
            />
            <svg
              className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2 text-xs font-bold text-neutral-400 hover:text-neutral-800 cursor-pointer"
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Table Body */}
        <div className="overflow-x-auto max-h-[540px] overflow-y-auto relative">
          <table className="w-full min-w-[840px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#FAFBFD] z-10 border-b border-neutral-200 shadow-xs">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  PO #
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Supplier
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Items & Units
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Total Cost
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Date
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-neutral-400 font-mono text-xs uppercase tracking-wider"
                  >
                    Loading purchase orders...
                  </td>
                </tr>
              ) : paginatedOrders.length > 0 ? (
                paginatedOrders.map((po) => {
                  const status = String(po.status || 'PENDING').toUpperCase();
                  const isPending = status === 'PENDING';
                  const itemCount = po.items?.length || 0;
                  const unitCount = po.items?.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || 0;

                  return (
                    <tr
                      key={po.id}
                      className="hover:bg-[#F9FAFC] transition-colors font-medium text-neutral-800"
                    >
                      {/* PO # */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-black text-neutral-900">
                          #{po.id}
                        </span>
                      </td>

                      {/* Supplier */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-neutral-900 text-xs">
                            {po.supplierName || `Supplier #${po.supplierId}`}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            By @{po.createdByUsername || 'admin'}
                          </span>
                        </div>
                      </td>

                      {/* Items & Units */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-neutral-700">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'} ({unitCount} units)
                        </span>
                      </td>

                      {/* Total Cost */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-black text-neutral-900 text-xs">
                          ${Number(po.totalCost || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono text-neutral-600">
                        {po.orderDate ? new Date(po.orderDate).toLocaleDateString() : '—'}
                      </td>

                      {/* Status Pill (Black-and-white plain outlined text pill) */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border border-neutral-300 text-neutral-800 bg-white">
                          {status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenView(po)}
                            className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                          >
                            View
                          </button>

                          {/* PENDING: Show Receive and Cancel. Hidden otherwise (never rendered disabled). */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReceive(po)}
                                className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-900 hover:bg-neutral-900 hover:text-white border border-neutral-300 hover:border-neutral-900 rounded-lg transition-colors cursor-pointer"
                                title="Receive stock and log stock-in movement"
                              >
                                Receive
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCancelOrder(po)}
                                className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancel purchase order"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-neutral-400 font-mono text-xs uppercase tracking-wider"
                  >
                    No purchase orders found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination Controls */}
        <div className="p-4 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/30">
          <span className="text-xs font-mono text-neutral-500 font-bold">
            Showing{' '}
            {filteredOrders.length === 0
              ? '0'
              : `${(activePage - 1) * PAGE_SIZE + 1}–${Math.min(
                  activePage * PAGE_SIZE,
                  filteredOrders.length
                )}`}{' '}
            of {filteredOrders.length} orders
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                const isCurrent = pageNum === activePage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center text-xs font-mono font-black rounded-xl transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={activePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SINGLE SHARED MODAL: PurchaseOrderForm (create | view) */}
      {modalState.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <PurchaseOrderForm
              mode={modalState.mode}
              initialData={modalState.purchaseOrder}
              onSubmit={handleCreateSubmit}
              onCancel={handleCloseModal}
              isSubmitting={isSubmitting}
              suppliers={suppliers}
              products={products}
            />
          </div>
        </div>
      )}
    </div>
  );
}
