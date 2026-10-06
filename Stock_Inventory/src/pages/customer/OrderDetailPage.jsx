import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import OrderReceipt, {
  canCancelOrder,
  getCancelDeadline,
  formatDeadlineDate,
} from '../../components/OrderReceipt';
import { getOrderById, cancelOrder } from '../../api/orders';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await getOrderById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setOrder(data);
      }
    } catch (err) {
      console.warn('Failed to load order:', err);
      // Backend returns 403 (forbidden ownership) or 404 (not found)
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleCancel = async () => {
    setCancelError('');
    setCancelling(true);
    try {
      await cancelOrder(id);
      setConfirmCancel(false);
      // Refetch the real post-cancel data from backend
      await fetchOrder();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        'Unable to cancel order.';
      setCancelError(
        typeof msg === 'string' ? msg.replace(/^Error\s*:\s*/i, '') : 'Unable to cancel order.'
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface min-h-screen py-10">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12">
          <div className="border border-line bg-white p-12 text-center text-xs font-mono uppercase tracking-wider text-muted shadow-surface">
            Loading order details...
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="bg-surface min-h-screen py-10">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12">
          <div className="mx-auto max-w-[640px] border border-line bg-white p-12 md:p-16 text-center shadow-sm">
            <h2 className="text-base md:text-lg font-bold uppercase tracking-tight text-ink mb-2">
              Order not found
            </h2>
            <p className="text-xs text-muted mb-6">
              The requested order could not be found or you do not have permission to view it.
            </p>
            <Link
              to="/orders"
              className="inline-flex h-11 px-8 bg-ink text-white text-xs font-bold uppercase tracking-[0.12em] hover:bg-neutral-800 transition-colors items-center justify-center cursor-pointer"
            >
              ← Back to Order History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const qualifiesForCancel = canCancelOrder(order);
  const cancelDeadline = getCancelDeadline(order?.orderDate);
  const formattedDeadline = formatDeadlineDate(cancelDeadline);
  const isCancelled = String(order?.status).toUpperCase() === 'CANCELLED';

  return (
    <div className="bg-surface min-h-screen py-10">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-line pb-6 mb-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              SETTLEMENT SPECIFICATION
            </span>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl mt-1">
              ORDER RECEIPT
            </h1>
          </div>
          <Link
            to="/orders"
            className="text-xs font-bold uppercase tracking-wider text-ink hover:underline cursor-pointer"
          >
            ← Back to Order History
          </Link>
        </div>

        {/* Shared OrderReceipt Component */}
        <OrderReceipt order={order}>
          {/* Error Message if Cancellation Fails */}
          {cancelError && (
            <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-700 text-xs font-semibold">
              {cancelError}
            </div>
          )}

          {/* Cancellation Notice Banner with Expired Date info */}
          {qualifiesForCancel ? (
            <div className="border border-line bg-white p-3.5 flex items-center gap-3 text-xs text-muted shadow-surface mb-4">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-ink flex-shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <span className="font-bold text-ink block">
                  Cancellation allowed until: {formattedDeadline}
                </span>
                <span className="text-[11px] text-muted">
                  You can self-cancel this order within 2 hours of placement. Cancellation will expire after this date.
                </span>
              </div>
            </div>
          ) : !isCancelled && cancelDeadline ? (
            <div className="border border-line bg-neutral-100/70 p-3.5 flex items-center gap-3 text-xs text-muted shadow-surface mb-4">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-muted flex-shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <div>
                <span className="font-bold text-ink block">
                  Cancellation expired: {formattedDeadline}
                </span>
                <span className="text-[11px] text-muted">
                  The 2-hour cancellation window has ended. You can no longer cancel this order.
                </span>
              </div>
            </div>
          ) : null}

          {/* Inline Cancel Order Action (Only shown if eligible) */}
          {qualifiesForCancel && (
            <div className="mb-6 pt-2">
              {confirmCancel ? (
                <div className="p-4 border border-line bg-white space-y-3">
                  <p className="text-xs text-ink font-medium">
                    Are you sure you want to cancel this order? This will restore item stock and void payment.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={handleCancel}
                      className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                    </button>
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => setConfirmCancel(false)}
                      className="px-4 py-2 border border-line bg-transparent text-xs font-bold uppercase tracking-wider text-ink hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      No, Keep Order
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="w-full py-3 border border-red-300 text-red-600 text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Cancel Order
                </button>
              )}
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Link
              to="/orders"
              className="w-full h-12 bg-ink text-white text-xs font-bold uppercase tracking-[0.14em] hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              RETURN TO ORDERS →
            </Link>
            <Link
              to="/shop"
              className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-ink hover:underline pt-1 cursor-pointer"
            >
              CONTINUE SHOPPING
            </Link>
          </div>
        </OrderReceipt>
      </div>
    </div>
  );
}
