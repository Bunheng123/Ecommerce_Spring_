import { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
} from '../../api/orders';
import {
  formatPaymentMethod,
  formatPaymentStatus,
  formatOrderStatus,
  formatOrderDate,
} from '../../components/OrderReceipt';
import { AlertDialog, ConfirmDialog, Toast } from '../utils/swalConfig';
import { getApiErrorMessage } from '../../api/stockMovements';

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Fetch real customer orders from backend
  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load customer orders:', err);
      const msg = getApiErrorMessage(err, 'Unable to load customer orders from server');
      AlertDialog.fire({ title: 'Load Failed', text: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Update order status with real-time feedback
  const handleStatusChange = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;
    setUpdatingId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updated, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, ...updated, status: newStatus }));
      }
      Toast.fire({ title: `Order #${orderId} status set to ${newStatus}` });
    } catch (err) {
      console.error('Failed to update order status:', err);
      const msg = getApiErrorMessage(err, 'Failed to update order status');
      AlertDialog.fire({ title: 'Update Failed', text: msg });
    } finally {
      setUpdatingId(null);
    }
  };

  // Update payment status with real-time feedback
  const handlePaymentStatusChange = async (orderId, newPaymentStatus) => {
    if (!orderId || !newPaymentStatus) return;
    setUpdatingId(orderId);
    try {
      const updated = await updatePaymentStatus(orderId, newPaymentStatus);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, ...updated, paymentStatus: newPaymentStatus } : o
        )
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, ...updated, paymentStatus: newPaymentStatus }));
      }
      Toast.fire({ title: `Order #${orderId} payment set to ${newPaymentStatus}` });
    } catch (err) {
      console.error('Failed to update payment status:', err);
      const msg = getApiErrorMessage(err, 'Failed to update payment status');
      AlertDialog.fire({ title: 'Update Failed', text: msg });
    } finally {
      setUpdatingId(null);
    }
  };

  // Live statistical calculations
  const totalVolume = useMemo(() => {
    return orders
      .filter((o) => String(o.status).toUpperCase() !== 'CANCELLED')
      .reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  }, [orders]);

  const pendingSettlementCount = useMemo(() => {
    return orders.filter(
      (o) =>
        String(o.status).toUpperCase() === 'PENDING' ||
        String(o.paymentStatus).toUpperCase() === 'UNPAID'
    ).length;
  }, [orders]);

  // Filtered dataset
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      // Search match
      const orderIdStr = String(o.id || '');
      const userStr = String(o.username || o.userId || '').toLowerCase();
      const addrStr = String(o.shippingAddress || '').toLowerCase();
      const statusStr = String(o.status || '').toLowerCase();
      const payStr = String(o.paymentStatus || '').toLowerCase();
      const itemsStr = Array.isArray(o.orderItems)
        ? o.orderItems.map((it) => it.productName).join(' ').toLowerCase()
        : '';

      const matchesSearch =
        !q ||
        orderIdStr.includes(q) ||
        userStr.includes(q) ||
        addrStr.includes(q) ||
        statusStr.includes(q) ||
        payStr.includes(q) ||
        itemsStr.includes(q);

      // Status match
      const matchesStatus =
        statusFilter === 'ALL' ||
        String(o.status).toUpperCase() === statusFilter.toUpperCase();

      // Payment match
      const matchesPayment =
        paymentFilter === 'ALL' ||
        String(o.paymentStatus).toUpperCase() === paymentFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
            Real-time customer settlements, fulfillment dispatch, and payment status updates.
          </p>
        </div>

        {/* Real-time Refresh Action */}
        <button
          type="button"
          onClick={() => loadOrders(false)}
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
          <span>{loading ? 'Refreshing...' : 'Refresh Orders'}</span>
        </button>
      </div>

      {/* Metric Cards (Live Real-time Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Total Orders"
          value={loading ? '...' : String(orders.length).padStart(2, '0')}
          subtext="Lifetime processed in system"
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

      {/* Main Table Card */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface">
        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Orders Ledger
            </h2>
            <span className="text-xs font-black bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full border border-neutral-200">
              {loading ? 'Fetching...' : `${filtered.length} Orders`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ORD#, user, item..."
                className="w-full bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 placeholder:text-neutral-400 rounded-xl px-4 py-2.5 outline-none focus:border-neutral-900 focus:bg-white transition-all"
              />
            </div>

            {/* Status Filter */}
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
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            {/* Payment Filter */}
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

        {/* Data Presentation (Loading / Empty / Table) */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <span className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
              Fetching real-time customer orders...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-sm font-bold uppercase text-neutral-800 mb-1">
              No matching orders found
            </h3>
            <p className="text-xs text-neutral-500">
              {search || statusFilter !== 'ALL' || paymentFilter !== 'ALL'
                ? 'Try adjusting your search query or filters.'
                : 'Customer orders placed on the storefront will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[980px] text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                  <th className="py-4 px-4 whitespace-nowrap">Order Ref</th>
                  <th className="py-4 px-4 whitespace-nowrap">Customer</th>
                  <th className="py-4 px-4 whitespace-nowrap">Placed Date</th>
                  <th className="py-4 px-4 whitespace-nowrap">Items Summary</th>
                  <th className="py-4 px-4 whitespace-nowrap">Total</th>
                  <th className="py-4 px-4 whitespace-nowrap">Payment</th>
                  <th className="py-4 px-4 whitespace-nowrap">Order Status</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {pageItems.map((o) => {
                  const itemsCount = Array.isArray(o.orderItems)
                    ? o.orderItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)
                    : 0;
                  const firstItemName =
                    Array.isArray(o.orderItems) && o.orderItems.length > 0
                      ? o.orderItems[0].productName
                      : 'Artifact item';
                  const extraItems = Array.isArray(o.orderItems) ? o.orderItems.length - 1 : 0;
                  const itemPreviewText =
                    extraItems > 0
                      ? `${itemsCount} item(s) — ${firstItemName}, +${extraItems} more`
                      : `${itemsCount} item(s) — ${firstItemName}`;

                  const isUpdatingThis = updatingId === o.id;

                  return (
                    <tr key={o.id} className="hover:bg-[#F9FAFC] transition-colors">
                      {/* Order Reference */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-xs bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-800 border border-neutral-200 whitespace-nowrap">
                          ORD-#{o.id}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-neutral-900 block whitespace-nowrap">
                          {o.username ? `@${o.username}` : `User #${o.userId || 'N/A'}`}
                        </span>
                        {o.shippingAddress && (
                          <span
                            className="text-[10px] text-neutral-400 truncate max-w-[150px] block font-mono whitespace-nowrap"
                            title={o.shippingAddress}
                          >
                            {o.shippingAddress}
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-4 font-medium text-neutral-600 whitespace-nowrap">
                        {o.orderDate ? formatOrderDate(o.orderDate) : 'Recent'}
                      </td>

                      {/* Items */}
                      <td className="py-4 px-4 font-medium text-neutral-600 max-w-[200px] truncate whitespace-nowrap" title={itemPreviewText}>
                        {itemPreviewText}
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-4 font-black text-sm text-neutral-900 whitespace-nowrap">
                        ${Number(o.totalAmount || 0).toFixed(2)}
                      </td>

                      {/* Payment Status Dropdown Selector */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="relative inline-block whitespace-nowrap">
                          <select
                            disabled={isUpdatingThis}
                            value={String(o.paymentStatus || 'UNPAID').toUpperCase()}
                            onChange={(e) => handlePaymentStatusChange(o.id, e.target.value)}
                            className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-neutral-200 bg-white hover:border-neutral-400 outline-none cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            <option value="UNPAID">UNPAID</option>
                            <option value="PAID">PAID</option>
                            <option value="REFUNDED">REFUNDED</option>
                          </select>
                        </div>
                      </td>

                      {/* Order Status Dropdown Selector */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="relative inline-block whitespace-nowrap">
                          <select
                            disabled={isUpdatingThis}
                            value={String(o.status || 'PENDING').toUpperCase()}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-neutral-200 bg-white hover:border-neutral-400 outline-none cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>
                      </td>

                      {/* Action Details */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && pageCount > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-neutral-100 mt-6 text-xs font-bold text-neutral-600">
            <span>
              Page {safePage} of {pageCount} ({filtered.length} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-neutral-200 shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6 animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-neutral-200">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block">
                  ORDER SPECIFICATION
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-neutral-900 mt-0.5">
                  Order #{selectedOrder.id}
                </h3>
                <p className="text-xs font-mono text-neutral-500 mt-0.5">
                  Placed: {selectedOrder.orderDate ? formatOrderDate(selectedOrder.orderDate) : 'N/A'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Status Control Bar in Modal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
                  Change Order Status:
                </span>
                <select
                  disabled={updatingId === selectedOrder.id}
                  value={String(selectedOrder.status || 'PENDING').toUpperCase()}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                  className="w-full h-9 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 px-3 outline-none cursor-pointer"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
                  Change Payment Status:
                </span>
                <select
                  disabled={updatingId === selectedOrder.id}
                  value={String(selectedOrder.paymentStatus || 'UNPAID').toUpperCase()}
                  onChange={(e) => handlePaymentStatusChange(selectedOrder.id, e.target.value)}
                  className="w-full h-9 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 px-3 outline-none cursor-pointer"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PAID">PAID</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>
            </div>

            {/* Customer & Logistics Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 border border-neutral-200/80 rounded-2xl bg-white space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                  Customer Profile
                </span>
                <p className="font-bold text-neutral-900">
                  {selectedOrder.username ? `@${selectedOrder.username}` : `User ID: ${selectedOrder.userId || 'N/A'}`}
                </p>
                <p className="text-neutral-500 font-mono">
                  User Record ID: #{selectedOrder.userId || 'N/A'}
                </p>
                {selectedOrder.customerNote && (
                  <p className="text-neutral-600 italic pt-1 border-t border-neutral-100">
                    Note: "{selectedOrder.customerNote}"
                  </p>
                )}
              </div>

              <div className="p-4 border border-neutral-200/80 rounded-2xl bg-white space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                  Delivery Destination
                </span>
                <p className="font-medium text-neutral-800 leading-relaxed">
                  {selectedOrder.shippingAddress || 'No shipping address provided'}
                </p>
                <p className="text-[11px] font-bold text-neutral-600 pt-1 border-t border-neutral-100">
                  Payment Method: {formatPaymentMethod(selectedOrder.paymentMethod)}
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-2">
                Order Items ({selectedOrder.orderItems?.length || 0})
              </span>
              <div className="border border-neutral-200/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-black uppercase tracking-wider text-neutral-500">
                    <tr>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Qty</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                    {Array.isArray(selectedOrder.orderItems) && selectedOrder.orderItems.length > 0 ? (
                      selectedOrder.orderItems.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="py-3 px-4 font-bold text-neutral-900">
                            {item.productName || 'Artifact item'}
                            {item.productId && (
                              <span className="text-[10px] font-mono text-neutral-400 block">
                                SKU-PRD-{item.productId}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            ${Number(item.price || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-neutral-900">
                            ${Number(item.subTotal != null ? item.subTotal : (item.price || 0) * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-4 text-center text-neutral-400">
                          No line items recorded for this order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Footer */}
            <div className="flex items-center justify-between p-4 bg-neutral-900 text-white rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider">
                Total Settlement
              </span>
              <span className="text-lg font-black tracking-tight">
                ${Number(selectedOrder.totalAmount || 0).toFixed(2)} USD
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
