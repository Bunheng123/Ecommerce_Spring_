import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import OrderReceipt, {
  canCancelOrder,
  getCancelDeadline,
  formatDeadlineDate,
  formatOrderDate,
  formatOrderStatus,
  formatPaymentMethod,
} from '../../components/OrderReceipt';
import { getOrderById, cancelOrder } from '../../api/orders';
import { ConfirmDialog, AlertDialog } from '../../admin/utils/swalConfig';

/**
 * Visual monochrome Order Status Stepper
 * Driven by order status (PENDING, COMPLETED, CANCELLED), paymentStatus (UNPAID, PAID, REFUNDED), and orderDate.
 */
function OrderStatusStepper({ order }) {
  const [now] = useState(() => Date.now());
  if (!order) return null;
  const statusUpper = String(order.status || '').toUpperCase();
  const paymentUpper = String(order.paymentStatus || '').toUpperCase();
  const isCancelled = statusUpper === 'CANCELLED';

  if (isCancelled) {
    let refundPill = 'UNPAID / VOIDED';
    let refundText = 'This order was cancelled prior to payment settlement. No charges were incurred.';

    if (paymentUpper === 'REFUNDED') {
      refundPill = 'REFUNDED (< 2H)';
      refundText = 'This order was cancelled within the 2-hour cancellation window. Payment has been refunded and item stock restored.';
    } else if (paymentUpper === 'PAID') {
      refundPill = 'PAID (NON-REFUNDABLE > 2H)';
      refundText = 'This order was cancelled after the 2-hour cancellation window. Payment remains recorded and non-refundable.';
    }

    return (
      <div className="border border-line bg-white p-6 md:p-8 shadow-surface mb-8 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              ✕
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block">
                STATUS RESOLUTION
              </span>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-ink">
                ORDER CANCELLED
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 border border-neutral-900 text-[10px] font-bold uppercase tracking-wider text-neutral-900 bg-neutral-50">
              CANCELLED
            </span>
            <span className="px-2.5 py-1 border border-line text-[10px] font-bold uppercase tracking-wider text-muted bg-white">
              {refundPill}
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed font-medium">
          {refundText}
        </p>

        {order.orderDate && (
          <p className="text-[11px] text-muted font-mono mt-3">
            Originally placed: {formatOrderDate(order.orderDate)}
          </p>
        )}
      </div>
    );
  }

  // Active / Completed Stepper (PENDING or COMPLETED)
  const paymentMethodUpper = String(order.paymentMethod || '').toUpperCase();
  const isCod = paymentMethodUpper === 'CASH_ON_DELIVERY';
  const isPaid = paymentUpper === 'PAID';

  let elapsedHours = 0;
  if (order.orderDate) {
    const orderTime = new Date(order.orderDate).getTime();
    if (!isNaN(orderTime)) {
      elapsedHours = Math.max(0, (now - orderTime) / (1000 * 60 * 60));
    }
  }

  const isCompleted = statusUpper === 'COMPLETED' || elapsedHours >= 48;
  const isPending = statusUpper === 'PENDING' && !isCompleted;

  let scooterPercent;
  let tooltipText;
  let showGreenDot;
  let isPulsingGreen = false;

  if (isCompleted) {
    scooterPercent = 96;
    tooltipText = 'DELIVERED • COMPLETED';
    showGreenDot = true;
    isPulsingGreen = false;
  } else if (isPending && !isPaid && !isCod) {
    scooterPercent = 33;
    tooltipText = 'AWAITING PAYMENT • EST. 2 DAYS';
    showGreenDot = false;
  } else {
    // In transit (PAID or COD)
    const progressFraction = Math.min(Math.max(elapsedHours / 48, 0), 1);
    scooterPercent = 62 + progressFraction * (90 - 62);
    tooltipText =
      elapsedHours < 24
        ? 'IN TRANSIT • ARRIVING IN 2 DAYS'
        : 'IN TRANSIT • ARRIVING IN 1 DAY';
    showGreenDot = true;
    isPulsingGreen = true;
  }

  const isStep2Done = isPaid || isCod || isCompleted;
  const isStep3Done = isCompleted;

  return (
    <div className="border border-line bg-white p-6 md:p-8 shadow-surface mb-8 no-print">
      <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block">
            FULFILLMENT PROGRESSION
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-ink mt-0.5">
            ORDER STATUS TRACKER
          </h2>
        </div>
        <span className="px-2.5 py-1 border border-ink text-[10px] font-bold uppercase tracking-wider text-ink bg-white">
          {formatOrderStatus(isCompleted ? 'COMPLETED' : order.status)}
        </span>
      </div>

      {/* Stepper Steps with Connecting Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {/* Step 1: Order Placed */}
        <div className="border border-line bg-[#FAFAFA] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono">
                STAGE 01
              </span>
              <div className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">
                ✓
              </div>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              Order Placed
            </h3>
            <p className="text-[11px] text-muted font-mono mt-1 leading-snug">
              {order.orderDate ? formatOrderDate(order.orderDate) : 'Completed'}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink border-t border-line/60 pt-2.5 mt-3 block">
            ● Completed
          </span>
        </div>

        {/* Step 2: Payment Confirmed / Processing */}
        <div
          className={`border p-4 flex flex-col justify-between transition-colors ${
            isStep2Done
              ? 'border-line bg-[#FAFAFA]'
              : 'border-ink bg-white shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono">
                STAGE 02
              </span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isStep2Done
                    ? 'bg-ink text-white'
                    : 'border-2 border-ink text-ink bg-white'
                }`}
              >
                {isStep2Done ? '✓' : <span className="w-2 h-2 rounded-full bg-ink animate-pulse" />}
              </div>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              {isStep2Done ? 'Payment Confirmed' : 'Payment Processing'}
            </h3>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              {isStep2Done
                ? `Paid via ${formatPaymentMethod(order.paymentMethod)}`
                : 'Awaiting Payment Confirmation'}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider border-t border-line/60 pt-2.5 mt-3 block ${
              isStep2Done ? 'text-ink' : 'text-neutral-900 font-extrabold'
            }`}
          >
            {isStep2Done ? '● Confirmed' : '◐ In Progress'}
          </span>
        </div>

        {/* Step 3: Order Completed & Delivered */}
        <div
          className={`border p-4 flex flex-col justify-between transition-colors ${
            isStep3Done
              ? 'border-line bg-[#FAFAFA]'
              : 'border-line/70 bg-neutral-50/50 text-muted'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono">
                STAGE 03
              </span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isStep3Done
                    ? 'bg-ink text-white'
                    : 'border border-neutral-300 text-neutral-400 bg-white'
                }`}
              >
                {isStep3Done ? '✓' : '03'}
              </div>
            </div>
            <h3
              className={`text-xs font-bold uppercase tracking-wider ${
                isStep3Done ? 'text-ink' : 'text-neutral-500'
              }`}
            >
              Completed & Delivered
            </h3>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              {isStep3Done
                ? 'Order finalized and parcel delivered'
                : 'Preparing for final dispatch & delivery'}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted border-t border-line/60 pt-2.5 mt-3 block">
            {isStep3Done ? '● Completed' : '○ Upcoming'}
          </span>
        </div>
      </div>

      {/* Delivery Motor/Scooter Track Bar */}
      <div className="h-7 bg-neutral-200/80 rounded-full relative flex items-center px-3 mt-10 no-print">
        {/* Dashed Road Line */}
        <div className="border-t-2 border-dashed border-neutral-300 w-full" />

        {/* Solid Black Progress Line */}
        <div
          className="absolute left-3 h-1 bg-neutral-900 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `calc(${scooterPercent}% - 12px)` }}
        />

        {/* Delivery Scooter / Motor SVG Icon & Floating Dark Tooltip */}
        <div
          className="absolute top-1/2 flex flex-col items-center transition-all duration-1000 ease-out z-10 select-none pointer-events-none"
          style={{ left: `${scooterPercent}%`, transform: 'translate(-50%, -50%)' }}
        >
          {/* Floating Dark Tooltip Badge Above Scooter */}
          <div className="absolute bottom-[calc(100%+6px)] bg-neutral-900 text-white text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded shadow-md flex items-center gap-1.5 whitespace-nowrap">
            <span>{tooltipText}</span>
            {showGreenDot && (
              <span
                className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${
                  isPulsingGreen ? 'animate-pulse' : ''
                }`}
              />
            )}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-neutral-900" />
          </div>

          {/* Crisp Black-and-White Delivery Scooter/Rider SVG facing right */}
          <svg
            viewBox="0 0 36 28"
            className={`w-9 h-7 text-neutral-900 flex-shrink-0 ${
              isPending ? 'animate-scooter-bobble' : ''
            }`}
            fill="currentColor"
          >
            {/* Delivery Box */}
            <rect x="2" y="7" width="9" height="9" rx="1.5" fill="#171717" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="2" y1="11.5" x2="11" y2="11.5" stroke="#ffffff" strokeWidth="0.8" />

            {/* Rider Body & Arm */}
            <circle cx="15.5" cy="5" r="3.2" fill="#171717" />
            <path d="M12.5 10 C12.5 9, 17 9, 18 11 L20 15 L16 16.5 L14 13.5 Z" fill="#171717" />
            <path d="M17.5 12 L22 13.5" stroke="#171717" strokeWidth="1.6" strokeLinecap="round" />

            {/* Scooter Chassis & Handlebars */}
            <path d="M10 16 L22 16 L24 13.5" stroke="#171717" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M22 16 L25 21 L28 21" stroke="#171717" strokeWidth="2" strokeLinecap="round" fill="none" />
            <line x1="23.5" y1="13.5" x2="22" y2="12" stroke="#171717" strokeWidth="1.5" strokeLinecap="round" />

            {/* Rear Wheel */}
            <circle cx="8" cy="22" r="4" fill="#ffffff" stroke="#171717" strokeWidth="2" />
            <circle cx="8" cy="22" r="1.5" fill="#171717" />

            {/* Front Wheel */}
            <circle cx="28" cy="22" r="4" fill="#ffffff" stroke="#171717" strokeWidth="2" />
            <circle cx="28" cy="22" r="1.5" fill="#171717" />

            {/* Footrest / Mudguards */}
            <path d="M6 19 Q8 16 12 18 L18 19 L21 21" fill="none" stroke="#171717" strokeWidth="1.2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Silent refetch that updates order state without triggering full-page loading spinner
  const silentRefetch = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getOrderById(id);
      if (data) {
        setOrder(data);
      }
    } catch (err) {
      console.debug('Silent order refresh skipped:', err);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Live auto-sync: 8-second polling interval + focus / visibilitychange listeners active ONLY while isPending is true
  useEffect(() => {
    const isPending = String(order?.status || '').toUpperCase() === 'PENDING';
    if (!isPending || !id) return;

    // 8-second polling interval
    const interval = setInterval(() => {
      silentRefetch();
    }, 8000);

    // Window focus listener
    const handleFocus = () => {
      silentRefetch();
    };

    // Document visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        silentRefetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [order?.status, id, silentRefetch]);

  const handleCancelWithConfirm = async () => {
    if (!order) return;
    const qualifiesForRefund = canCancelOrder(order);
    const cancelDeadline = getCancelDeadline(order.orderDate);
    const deadlineText = cancelDeadline ? formatDeadlineDate(cancelDeadline) : '';

    const cancelHtml = `
      <div style="text-align: left; font-size: 12px; color: #171717; margin-top: 4px;">
        <div style="background: #f7f7f7; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.05em;">Order Reference</span>
            <span style="font-family: monospace; font-weight: 700; font-size: 13px; color: #171717;">#${order.id}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.05em;">Deadline</span>
            <span style="font-weight: 600; font-size: 12px; color: #171717;">${deadlineText || 'Within 2 hours of placement'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.05em;">Refund Status</span>
            <span style="font-weight: 700; font-size: 12px; color: ${qualifiesForRefund ? '#15803d' : '#b91c1c'};">
              ${qualifiesForRefund ? '● Eligible for Refund' : '○ Non-Refundable'}
            </span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; line-height: 1.5; color: #404040; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 14px;">
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: #171717; font-weight: bold; flex-shrink: 0; margin-top: 1px;">•</span>
            <div>
              <strong style="color: #171717;">Cancellation Window:</strong>
              <div style="color: #525252; font-size: 11.5px; margin-top: 1px;">
                ${qualifiesForRefund 
                  ? `Self-cancellation is available until <strong>${deadlineText}</strong>.`
                  : `The 2-hour window ended on <strong>${deadlineText}</strong>.`}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: #171717; font-weight: bold; flex-shrink: 0; margin-top: 1px;">•</span>
            <div>
              <strong style="color: #171717;">Refund Policy:</strong>
              <div style="color: #525252; font-size: 11.5px; margin-top: 1px;">
                Orders cancelled within 2 hours are <strong>automatically refunded</strong> if paid. Cancellations after 2 hours are <strong>non-refundable</strong>.
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: #171717; font-weight: bold; flex-shrink: 0; margin-top: 1px;">•</span>
            <div>
              <strong style="color: #171717;">Inventory Restoration:</strong>
              <div style="color: #525252; font-size: 11.5px; margin-top: 1px;">
                All items in this order will be released and returned to store inventory immediately.
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: #171717; font-weight: bold; flex-shrink: 0; margin-top: 1px;">•</span>
            <div>
              <strong style="color: #171717;">Confirmation Notice:</strong>
              <div style="color: #525252; font-size: 11.5px; margin-top: 1px;">
                This action is permanent and cannot be undone once confirmed.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const result = await ConfirmDialog.fire({
      title: `Cancel Order #${order.id}?`,
      html: cancelHtml,
      confirmButtonText: 'Yes, Cancel Order',
      cancelButtonText: 'Keep Order',
      width: '520px',
    });

    if (!result.isConfirmed) return;

    setCancelling(true);
    try {
      await cancelOrder(id);
      await AlertDialog.fire({
        title: 'Order Cancelled',
        text: `Order #${id} has been cancelled successfully.`,
      });
      await fetchOrder();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        'Unable to cancel order.';
      AlertDialog.fire({
        title: 'Cancellation Failed',
        text: typeof msg === 'string' ? msg.replace(/^Error\s*:\s*/i, '') : 'Unable to cancel order.',
      });
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

  const isPending = String(order?.status || '').toUpperCase() === 'PENDING';
  const qualifiesForCancel = isPending && canCancelOrder(order);
  const cancelDeadline = getCancelDeadline(order.orderDate);
  const formattedDeadline = formatDeadlineDate(cancelDeadline);

  return (
    <div className="bg-surface min-h-screen py-10">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        {/* Top Header */}
        <div className="no-print flex items-center justify-between border-b border-line pb-6 mb-8">
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

        {/* Visual Order Status Stepper */}
        <OrderStatusStepper order={order} />

        {/* Shared OrderReceipt Component */}
        <OrderReceipt order={order}>
          {/* Cancellation Notice Banner (Shown ONLY for PENDING orders) */}
          {isPending && (
            qualifiesForCancel ? (
              <div className="border border-line bg-white p-4 text-xs shadow-surface mb-4">
                <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-line text-ink font-bold">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="uppercase tracking-wider text-[11px]">Cancellation Policy &amp; Terms</span>
                </div>
                <div className="space-y-2 text-[11.5px] text-muted">
                  <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-1.5">
                    <span className="font-semibold text-ink">Window Deadline:</span>
                    <span className="font-mono font-bold text-ink">{formattedDeadline}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-1.5">
                    <span className="font-semibold text-ink">Refund Status:</span>
                    <span className="text-emerald-700 font-bold">100% Automatic Refund (within 2 hours)</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">After 2 Hours:</span>
                    <span className="text-neutral-600">Payments become non-refundable</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-line bg-neutral-50 p-4 text-xs shadow-surface mb-4">
                <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-line text-neutral-600 font-bold">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span className="uppercase tracking-wider text-[11px]">Cancellation Window Expired</span>
                </div>
                <div className="space-y-2 text-[11.5px] text-muted">
                  <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-1.5">
                    <span className="font-semibold text-ink">Window Ended:</span>
                    <span className="font-mono font-bold text-ink">{formattedDeadline}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">Refund Status:</span>
                    <span className="text-neutral-600">Non-refundable (exceeded 2-hour window)</span>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Cancel Order Action Button (Visible ONLY when status === "PENDING") */}
          {isPending && (
            <div className="mb-6 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelWithConfirm}
                className="w-full py-3 border border-red-300 text-red-600 text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancelling ? 'Cancelling Order...' : 'Cancel Order'}
              </button>
            </div>
          )}

          {/* Navigation CTAs */}
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
