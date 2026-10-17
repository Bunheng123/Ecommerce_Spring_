import { useState, useEffect, useCallback, useMemo } from 'react';
import WholesaleOrderForm from '../components/WholesaleOrderForm';
import { Toast, ConfirmDialog, AlertDialog } from '../utils/swalConfig';
import {
  getAllWholesaleOrders,
  createWholesaleOrder,
  completeWholesaleOrder,
  cancelWholesaleOrder,
} from '../../api/wholesaleOrders';
import { getAllWholesaleBuyers } from '../../api/wholesaleBuyers';
import { fetchAdminProducts } from '../../api/products';

const PAGE_SIZE = 10;
const STATUS_FILTERS = ['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'];

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

export default function WholesaleOrdersPage() {
  const [wholesaleOrders, setWholesaleOrders] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State: ONLY 'create' | 'view' (NO edit flow per business rules!)
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'view'
    wholesaleOrder: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, buyerList, productList] = await Promise.all([
        getAllWholesaleOrders(),
        getAllWholesaleBuyers().catch(() => []),
        fetchAdminProducts().catch(() => []),
      ]);
      setWholesaleOrders(Array.isArray(orders) ? orders : []);
      setBuyers(Array.isArray(buyerList) ? buyerList : []);
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (err) {
      console.error('Failed to load wholesale orders data:', err);
      const msg = getBackendErrorMessage(err, 'Failed to fetch wholesale orders');
      AlertDialog.fire({ title: 'Load Failed', text: msg });
      setWholesaleOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getAllWholesaleOrders(),
      getAllWholesaleBuyers().catch(() => []),
      fetchAdminProducts().catch(() => []),
    ])
      .then(([orders, buyerList, productList]) => {
        if (isMounted) {
          setWholesaleOrders(Array.isArray(orders) ? orders : []);
          setBuyers(Array.isArray(buyerList) ? buyerList : []);
          setProducts(Array.isArray(productList) ? productList : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load wholesale orders data:', err);
          const msg = getBackendErrorMessage(err, 'Failed to fetch wholesale orders');
          AlertDialog.fire({ title: 'Load Failed', text: msg });
          setWholesaleOrders([]);
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
      wholesaleOrder: null,
    });
  };

  const handleOpenView = (order) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      wholesaleOrder: order,
    });
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setModalState({
      isOpen: false,
      mode: 'create',
      wholesaleOrder: null,
    });
  };

  // Create Order Handler
  const handleCreateSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await createWholesaleOrder(formData);
      Toast.fire({ title: 'Wholesale order registered successfully' });
      handleCloseModal();
      loadData();
    } catch (err) {
      console.error('Failed to create wholesale order:', err);
      const msg = getBackendErrorMessage(err, 'Failed to create wholesale order');
      AlertDialog.fire({ title: 'Creation Failed', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete Order Handler (calls PUT /api/wholesale-orders/{id}/complete)
  const handleComplete = async (order) => {
    const result = await ConfirmDialog.fire({
      title: 'Complete Wholesale Order?',
      text: `Complete Wholesale Order #${order.id}? This will deduct the required quantities from inventory stock and record stock-out movements.`,
      confirmButtonText: 'Mark Completed',
    });

    if (result.isConfirmed) {
      try {
        await completeWholesaleOrder(order.id);
        Toast.fire({ title: `Wholesale order #${order.id} completed successfully` });
        loadData();
      } catch (err) {
        console.error('Failed to complete wholesale order:', err);
        // Surface the real backend error message (e.g. Insufficient stock)
        const msg = getBackendErrorMessage(err, 'Failed to complete wholesale order');
        AlertDialog.fire({ title: 'Completion Failed', text: msg });
      }
    }
  };

  // Cancel Order Handler (calls PUT /api/wholesale-orders/{id}/cancel)
  const handleCancel = async (order) => {
    const result = await ConfirmDialog.fire({
      title: 'Cancel Wholesale Order?',
      text: `Cancel Wholesale Order #${order.id}? The order will be marked as CANCELLED with no stock modifications.`,
      confirmButtonText: 'Cancel Order',
    });

    if (result.isConfirmed) {
      try {
        await cancelWholesaleOrder(order.id);
        Toast.fire({ title: `Wholesale order #${order.id} cancelled` });
        loadData();
      } catch (err) {
        console.error('Failed to cancel wholesale order:', err);
        const msg = getBackendErrorMessage(err, 'Failed to cancel wholesale order');
        AlertDialog.fire({ title: 'Cancellation Failed', text: msg });
      }
    }
  };

  // Filtered & Paginated Orders
  const filteredOrders = useMemo(() => {
    return wholesaleOrders.filter((order) => {
      // Status filter
      const ordStatus = String(order.status || 'PENDING').toUpperCase();
      if (selectedStatus !== 'ALL' && ordStatus !== selectedStatus) {
        return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const ordId = String(order.id || '');
      const buyerName = String(order.buyerName || '').toLowerCase();
      const createdBy = String(order.createdByUsername || '').toLowerCase();

      return ordId.includes(q) || buyerName.includes(q) || createdBy.includes(q);
    });
  }, [wholesaleOrders, selectedStatus, searchQuery]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, activePage]);

  // Statistics
  const totalCount = wholesaleOrders.length;
  const pendingCount = wholesaleOrders.filter(
    (o) => String(o.status).toUpperCase() === 'PENDING'
  ).length;
  const completedCount = wholesaleOrders.filter(
    (o) => String(o.status).toUpperCase() === 'COMPLETED'
  ).length;
  const totalRevenue = wholesaleOrders
    .filter((o) => String(o.status).toUpperCase() === 'COMPLETED')
    .reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            BULK DISTRIBUTION
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight text-neutral-900">
            Wholesale Orders
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Process bulk commercial commitments, negotiate pricing, and record stock fulfillment
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="h-10 px-5 bg-neutral-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-neutral-800 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <span>+</span>
          <span>New Wholesale Order</span>
        </button>
      </div>

      {/* KPI Stat Cards (using shadow-surface) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Total Wholesale Orders
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
            Pending Orders
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
            Fulfilled & Completed
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {completedCount}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border border-neutral-300 text-neutral-800 bg-white">
              COMPLETED
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Total Wholesale Revenue
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              ${totalRevenue.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-neutral-400 font-mono">
              COMPLETED
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
              placeholder="Search by Order #, buyer, user..."
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
                  Order #
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Wholesale Buyer
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Items & Units
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Total Valuation
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
                    Loading wholesale orders...
                  </td>
                </tr>
              ) : paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => {
                  const status = String(order.status || 'PENDING').toUpperCase();
                  const isPending = status === 'PENDING';
                  const itemCount = order.items?.length || 0;
                  const unitCount =
                    order.items?.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || 0;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#F9FAFC] transition-colors font-medium text-neutral-800"
                    >
                      {/* Order # */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-black text-neutral-900">
                          #{order.id}
                        </span>
                      </td>

                      {/* Buyer */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-neutral-900 text-xs">
                            {order.buyerName || `Buyer #${order.buyerId}`}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            By @{order.createdByUsername || 'admin'}
                          </span>
                        </div>
                      </td>

                      {/* Items & Units */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-neutral-700">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'} ({unitCount} units)
                        </span>
                      </td>

                      {/* Total Valuation */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-black text-neutral-900 text-xs">
                          ${Number(order.totalAmount || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono text-neutral-600">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}
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
                          {/* Always show View */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(order)}
                            className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                          >
                            View
                          </button>

                          {/* PENDING: Show Mark Completed and Cancel. Hidden otherwise (never rendered disabled). */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleComplete(order)}
                                className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-900 hover:bg-neutral-900 hover:text-white border border-neutral-300 hover:border-neutral-900 rounded-lg transition-colors cursor-pointer"
                                title="Mark order as completed and deduct stock"
                              >
                                Mark Completed
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCancel(order)}
                                className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancel wholesale order"
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
                    No wholesale orders found matching your criteria.
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

      {/* SINGLE SHARED MODAL: WholesaleOrderForm (create | view) */}
      {modalState.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <WholesaleOrderForm
              mode={modalState.mode}
              initialData={modalState.wholesaleOrder}
              onSubmit={handleCreateSubmit}
              onCancel={handleCloseModal}
              isSubmitting={isSubmitting}
              buyers={buyers}
              products={products}
            />
          </div>
        </div>
      )}
    </div>
  );
}
