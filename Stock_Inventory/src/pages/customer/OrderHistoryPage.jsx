import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyOrders, cancelOrder } from '../../api/orders';
import {
  formatPaymentStatus,
  formatOrderStatus,
  formatOrderDate,
  canCancelOrder,
} from '../../components/OrderReceipt';

/**
 * Formats a short preview of the order's items
 * (First item's name + "+N more" if multiple)
 */
export function getOrderPreviewText(order) {
  const items = order?.orderItems || order?.items || [];
  if (items.length === 0) return 'No items recorded';
  const firstItem = items[0]?.productName || items[0]?.name || 'Artifact';
  const extraCount = items.length - 1;
  const totalCount = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  const countLabel = totalCount === 1 ? '1 item' : `${totalCount} items`;

  return extraCount > 0
    ? `${countLabel} — ${firstItem}, +${extraCount} more`
    : `${countLabel} — ${firstItem}`;
}

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setCancelError('');
    try {
      const data = await getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleConfirmCancel = async (orderId) => {
    setCancelError('');
    setCancelSuccessMsg('');
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId);
      setConfirmCancelId(null);
      setCancelSuccessMsg(`Order #${orderId} has been successfully cancelled.`);
      // Re-fetch the orders from backend immediately based on actual response
      await loadOrders();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to cancel order';
      setCancelError(msg.replace(/^Error\s*:\s*/i, ''));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="bg-surface min-h-screen py-10">
      <div className="mx-auto max-w-[960px] px-6 md:px-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-ink">
              ORDER HISTORY
            </h1>
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.14em] text-muted mt-1.5">
              VIEW AND MANAGE YOUR ORDERS.
            </p>
          </div>
          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="h-10 px-4 border border-line bg-white hover:bg-neutral-50 text-xs font-bold uppercase tracking-wider text-ink transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto shadow-2xs"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
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

        {cancelSuccessMsg && (
          <div className="mb-6 p-3 border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold animate-fadeIn flex items-center gap-2">
            <span>✓</span>
            <span>{cancelSuccessMsg}</span>
          </div>
        )}

        {cancelError && (
          <div className="mb-6 p-3 border border-red-300 bg-red-50 text-red-700 text-xs font-semibold animate-fadeIn flex items-center gap-2">
            <span>⚠</span>
            <span>{cancelError}</span>
          </div>
        )}

        {/* Loading State (based on real time that fetching takes) */}
        {loading ? (
          <div className="border border-line bg-white p-12 text-center text-xs font-mono uppercase tracking-wider text-muted flex flex-col items-center justify-center gap-3 shadow-surface">
            <span className="w-5 h-5 border-2 border-line border-t-ink rounded-full animate-spin" />
            <span>Fetching real-time orders...</span>
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="border border-line bg-white p-12 md:p-16 text-center shadow-surface">
            <h2 className="text-base font-bold uppercase tracking-tight text-ink mb-2">
              You haven't placed any orders yet
            </h2>
            <p className="text-xs text-muted mb-6">
              When you purchase items from our catalog, your receipts and order progress will appear here.
            </p>
            <Link
              to="/shop"
              className="inline-flex h-11 px-8 bg-ink text-white text-xs font-bold uppercase tracking-[0.12em] hover:bg-neutral-800 transition-colors items-center justify-center cursor-pointer"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          /* Orders List with horizontal overflow so data and buttons stay in a row */
          <div className="border border-line bg-white shadow-surface overflow-x-auto">
            <div className="min-w-[760px] divide-y divide-line">
              {orders.map((order) => {
                const isCancelled = String(order.status).toUpperCase() === 'CANCELLED';
                const qualifiesForCancel = canCancelOrder(order);
                const previewText = getOrderPreviewText(order);
                const orderDateStr = order.orderDate
                  ? new Date(order.orderDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <div
                    key={order.id}
                    className="p-6 md:p-8 flex items-center justify-between gap-6"
                  >
                    {/* Left Column: Order # + Date & Item Preview */}
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-sm md:text-base font-bold text-ink whitespace-nowrap">
                          Order #{order.id} — {orderDateStr}
                        </h2>
                      </div>

                      <p
                        className={`text-xs truncate max-w-md ${
                          isCancelled ? 'text-muted line-through opacity-75' : 'text-muted'
                        }`}
                        title={previewText}
                      >
                        {previewText}
                      </p>
                    </div>

                    {/* Right Column: Status, Payment Status, Amount & Actions (all in one row) */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex flex-col items-end text-right gap-0.5 min-w-[170px]">
                        <span className="text-xs font-bold uppercase tracking-wider text-ink whitespace-nowrap">
                          {formatOrderStatus(order.status)}
                        </span>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted whitespace-nowrap">
                          PAYMENT: {formatPaymentStatus(order.paymentStatus)}
                        </span>

                        <div className="text-sm md:text-base font-bold tracking-tight text-ink mt-0.5 whitespace-nowrap">
                          ${Number(order.totalAmount || 0).toFixed(2)} USD
                        </div>
                      </div>

                      {/* Actions: View Details and Cancel button */}
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          to={`/orders/${order.id}`}
                          className="px-3.5 py-2 bg-ink text-white text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                        >
                          VIEW DETAILS
                        </Link>

                        {qualifiesForCancel && (
                          confirmCancelId === order.id ? (
                            <div className="inline-flex items-center gap-2 text-[10px] whitespace-nowrap bg-neutral-50 px-2.5 py-1.5 border border-line">
                              <span className="text-ink font-bold">Cancel?</span>
                              <button
                                type="button"
                                disabled={cancellingId === order.id}
                                onClick={() => handleConfirmCancel(order.id)}
                                className="font-bold uppercase text-red-600 hover:underline cursor-pointer disabled:opacity-50"
                              >
                                {cancellingId === order.id ? 'Voiding...' : 'Yes, Cancel'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmCancelId(null)}
                                className="font-bold uppercase text-muted hover:text-ink cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelId(order.id)}
                              className="px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer"
                            >
                              CANCEL ORDER
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
