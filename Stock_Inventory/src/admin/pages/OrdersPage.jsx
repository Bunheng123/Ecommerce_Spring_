import { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard';
import OrderViewModal from '../components/OrderViewModal';
import {
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
} from '../../api/orders';
import {
  formatPaymentMethod,
  formatOrderDate,
} from '../../components/OrderReceipt';
import { AlertDialog, ConfirmDialog, Toast } from '../utils/swalConfig';

const PAGE_SIZE = 10;

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

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeActionId, setActiveActionId] = useState(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Modal state for View Receipt
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Fetch orders from backend
  const fetchOrdersData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load customer orders:', err);
      const msg = getBackendErrorMessage(err, 'Unable to load customer orders from server');
      AlertDialog.fire({ title: 'Load Failed', text: msg });
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getAllOrders()
      .then((data) => {
        if (isMounted) {
          setOrders(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load customer orders:', err);
          const msg = getBackendErrorMessage(err, 'Unable to load customer orders from server');
          AlertDialog.fire({ title: 'Load Failed', text: msg });
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Sort orders newest-first (orderDate descending) on client
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const timeA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const timeB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return timeB - timeA;
    });
  }, [orders]);

  // 2. Client-side filtering by status, payment, and search (Order ID or username)
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#|^ord-?/i, '');
    return sortedOrders.filter((order) => {
      const orderIdStr = String(order.id || '');
      const userStr = String(order.username || '').toLowerCase();

      const matchesSearch =
        !q ||
        orderIdStr.includes(q) ||
        userStr.includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        String(order.status || '').toUpperCase() === statusFilter.toUpperCase();

      const matchesPayment =
        paymentFilter === 'ALL' ||
        String(order.paymentStatus || '').toUpperCase() === paymentFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [sortedOrders, search, statusFilter, paymentFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Metrics for Stat Cards (using shadow-surface)
  const totalVolume = useMemo(() => {
    return orders
      .filter((o) => String(o.status || '').toUpperCase() !== 'CANCELLED')
      .reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  }, [orders]);

  const pendingSettlementCount = useMemo(() => {
    return orders.filter(
      (o) =>
        String(o.status || '').toUpperCase() === 'PENDING' ||
        String(o.paymentStatus || '').toUpperCase() === 'UNPAID'
    ).length;
  }, [orders]);

  // ─── Actions & Business Rules ──────────────────────────────────────────────

  // Action 1: View Receipt (wrapped in modal)
  const handleViewReceipt = (order) => {
    setReceiptOrder(order);
    setIsReceiptOpen(true);
  };

  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
    setReceiptOrder(null);
  };

  // Action 2: Mark Paid (non-terminal PENDING where paymentStatus === "UNPAID")
  const handleMarkPaid = async (order) => {
    const result = await ConfirmDialog.fire({
      title: `Mark Order #${order.id} as Paid?`,
      text: 'Record manual bank transfer confirmation before delivery? This updates payment status to PAID.',
      confirmButtonText: 'Confirm Payment',
    });
    if (!result.isConfirmed) return;

    setActiveActionId(order.id);
    try {
      const updated = await updatePaymentStatus(order.id, 'PAID');
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...updated, paymentStatus: 'PAID' } : o))
      );
      if (receiptOrder && receiptOrder.id === order.id) {
        setReceiptOrder((prev) => ({ ...prev, ...updated, paymentStatus: 'PAID' }));
      }
      Toast.fire({ title: `Order #${order.id} marked as PAID` });
    } catch (err) {
      console.error('Failed to update payment status:', err);
      const msg = getBackendErrorMessage(err, 'Failed to update payment status');
      AlertDialog.fire({ title: 'Payment Update Failed', text: msg });
    } finally {
      setActiveActionId(null);
    }
  };

  // Action 3: Mark Completed (status === "PENDING", backend auto-marks payment as PAID)
  const handleMarkCompleted = async (order) => {
    const result = await ConfirmDialog.fire({
      title: `Complete Order #${order.id}?`,
      text: 'Mark this order as COMPLETED? The backend will automatically record payment as PAID.',
      confirmButtonText: 'Mark Completed',
    });
    if (!result.isConfirmed) return;

    setActiveActionId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, 'COMPLETED');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, ...updated, status: 'COMPLETED', paymentStatus: 'PAID' }
            : o
        )
      );
      if (receiptOrder && receiptOrder.id === order.id) {
        setReceiptOrder((prev) => ({
          ...prev,
          ...updated,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
        }));
      }
      Toast.fire({ title: `Order #${order.id} marked as COMPLETED` });
    } catch (err) {
      console.error('Failed to complete order:', err);
      const msg = getBackendErrorMessage(err, 'Failed to complete order');
      AlertDialog.fire({ title: 'Completion Failed', text: msg });
    } finally {
      setActiveActionId(null);
    }
  };

  // Action 4: Cancel Order (status === "PENDING", explains 2-hour refund rule)
  const handleCancelOrder = async (order) => {
    const result = await ConfirmDialog.fire({
      title: `Cancel Order #${order.id}?`,
      text: 'Orders cancelled within 2 hours of placement are automatically refunded if paid. After 2 hours, no automatic refund is issued. Line items will be restocked.',
      confirmButtonText: 'Cancel Order',
    });
    if (!result.isConfirmed) return;

    setActiveActionId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, 'CANCELLED');
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o))
      );
      if (receiptOrder && receiptOrder.id === order.id) {
        setReceiptOrder((prev) => ({ ...prev, ...updated }));
      }
      Toast.fire({ title: `Order #${order.id} cancelled successfully` });
      // Reload in background to sync restored inventory and refund status
      fetchOrdersData(false);
    } catch (err) {
      console.error('Failed to cancel order:', err);
      const msg = getBackendErrorMessage(err, 'Failed to cancel order');
      AlertDialog.fire({ title: 'Cancellation Failed', text: msg });
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            FULFILLMENT &amp; TRANSACTIONS
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
            Customer Orders
          </h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Manage customer settlements, fulfillment dispatch, and payment status updates.
          </p>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => fetchOrdersData(true)}
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

      {/* Metric Cards (All use shared shadow-surface) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Total Orders"
          value={loading ? '...' : String(orders.length).padStart(2, '0')}
          subtext="Lifetime customer purchases"
          badge="Live Ledger"
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        <StatCard
          title="Gross Order Value"
          value={loading ? '...' : `$${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext="Non-cancelled settlements"
          trend="Real-time"
          trendUp={true}
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Pending Settlements"
          value={loading ? '...' : String(pendingSettlementCount).padStart(2, '0')}
          subtext="Requires fulfillment or payment"
          badge={pendingSettlementCount > 0 ? 'Needs Action' : 'All Clear'}
          icon={
            <svg className="w-5 h-5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Main Table Card (shared shadow-surface) */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface">
        {/* Controls Bar: Filters and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Orders Ledger
            </h2>
            <span className="text-xs font-black bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full border border-neutral-200">
              {loading ? 'Fetching...' : `${filteredOrders.length} Orders`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input: Search by Order ID or username */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Order ID or username..."
                className="w-full bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 placeholder:text-neutral-400 rounded-xl px-4 py-2.5 outline-none focus:border-neutral-900 focus:bg-white transition-all"
              />
            </div>

            {/* Filter by Order Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-neutral-900 focus:bg-white transition-all"
            >
              <option value="ALL">Status: All</option>
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            {/* Filter by Payment Status */}
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-neutral-900 focus:bg-white transition-all"
            >
              <option value="ALL">Payment: All</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PAID">PAID</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>
        </div>

        {/* Presentation: Loading / Empty / Scrollable Table */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <span className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
              Loading orders...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-sm font-bold uppercase text-neutral-800 mb-1">
              No matching orders found
            </h3>
            <p className="text-xs text-neutral-500">
              {search || statusFilter !== 'ALL' || paymentFilter !== 'ALL'
                ? 'Try adjusting your search query or status filters.'
                : 'Customer orders placed on the storefront will appear here.'}
            </p>
          </div>
        ) : (
          /* Scrollable table body */
          <div className="overflow-x-auto max-h-[58vh] overflow-y-auto mt-4 border border-neutral-200/80 rounded-2xl">
            <table className="w-full min-w-[960px] text-left border-collapse">
              <thead className="sticky top-0 bg-[#FAFBFD] z-10 border-b border-neutral-200">
                <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                  <th className="py-3.5 px-4 whitespace-nowrap">Order ID</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Customer</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Order Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Payment Method</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Total Amount</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Payment Status</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Order Status</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {pageItems.map((order) => {
                  const status = String(order.status || 'PENDING').toUpperCase();
                  const paymentStatus = String(order.paymentStatus || 'UNPAID').toUpperCase();
                  const isPending = status === 'PENDING';
                  const isUnpaid = paymentStatus === 'UNPAID';
                  const isProcessing = activeActionId === order.id;

                  // Business rule checks (hide inapplicable, never disable)
                  const showMarkPaid = isPending && isUnpaid;
                  const showMarkCompleted = isPending;
                  const showCancel = isPending;

                  return (
                    <tr key={order.id} className="hover:bg-[#F9FAFC] transition-colors">
                      {/* Column 1: Order ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-xs text-neutral-900">
                          #{order.id}
                        </span>
                      </td>

                      {/* Column 2: Customer (username only - do not invent name or email) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-neutral-900 block font-mono">
                          {order.username ? `@${order.username}` : `User #${order.userId || 'N/A'}`}
                        </span>
                      </td>

                      {/* Column 3: Order Date */}
                      <td className="py-3.5 px-4 font-medium text-neutral-600 whitespace-nowrap">
                        {order.orderDate ? formatOrderDate(order.orderDate) : '—'}
                      </td>

                      {/* Column 4: Payment Method */}
                      <td className="py-3.5 px-4 font-medium text-neutral-700 whitespace-nowrap">
                        {formatPaymentMethod(order.paymentMethod)}
                      </td>

                      {/* Column 5: Total Amount */}
                      <td className="py-3.5 px-4 font-black text-sm text-neutral-900 whitespace-nowrap">
                        ${Number(order.totalAmount || 0).toFixed(2)}
                      </td>

                      {/* Column 6: Payment Status (plain outlined text pill) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-neutral-300 text-neutral-800 bg-white">
                          {paymentStatus}
                        </span>
                      </td>

                      {/* Column 7: Order Status (plain outlined text pill) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-neutral-300 text-neutral-800 bg-white">
                          {status}
                        </span>
                      </td>

                      {/* Column 8: Actions (hide inapplicable actions; never render disabled buttons) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Receipt: Always available on all rows */}
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(order)}
                            className="h-8 px-3 rounded-lg border border-neutral-300 hover:border-neutral-900 bg-white text-neutral-900 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            View Receipt
                          </button>

                          {/* Mark Paid: ONLY on non-terminal PENDING where paymentStatus === "UNPAID" */}
                          {showMarkPaid && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(order)}
                              disabled={isProcessing}
                              className="h-8 px-3 rounded-lg border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Mark Paid
                            </button>
                          )}

                          {/* Mark Completed: ONLY when status === "PENDING" */}
                          {showMarkCompleted && (
                            <button
                              type="button"
                              onClick={() => handleMarkCompleted(order)}
                              disabled={isProcessing}
                              className="h-8 px-3 rounded-lg border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Mark Completed
                            </button>
                          )}

                          {/* Cancel Order: ONLY when status === "PENDING" */}
                          {showCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order)}
                              disabled={isProcessing}
                              className="h-8 px-3 rounded-lg border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:text-neutral-900 bg-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls (10 items per page) */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-neutral-100 mt-6 text-xs font-bold text-neutral-600">
            <span>
              Page {safePage} of {totalPages} ({filteredOrders.length} orders total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 border border-neutral-200 rounded-xl hover:bg-neutral-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPage(num)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      num === safePage
                        ? 'bg-neutral-900 text-white'
                        : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 border border-neutral-200 rounded-xl hover:bg-neutral-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shared Order Receipt Modal */}
      <OrderViewModal
        order={receiptOrder}
        isOpen={isReceiptOpen}
        onClose={handleCloseReceipt}
      />
    </div>
  );
}
