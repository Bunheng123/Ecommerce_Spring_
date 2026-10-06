import React from 'react';

/**
 * Format payment method enum value for clean display
 * BANK_TRANSFER -> "Bank Transfer"
 * CASH_ON_DELIVERY -> "Cash on Delivery"
 * QR_PAYMENT -> "QR Payment"
 */
export function formatPaymentMethod(method) {
  if (!method) return 'Not Specified';
  switch (String(method).toUpperCase()) {
    case 'BANK_TRANSFER':
      return 'Bank Transfer';
    case 'CASH_ON_DELIVERY':
      return 'Cash on Delivery';
    case 'QR_PAYMENT':
      return 'QR Payment';
    default:
      return String(method);
  }
}

/**
 * Format payment status enum value for clean display
 * UNPAID -> "Unpaid — we'll confirm once payment is received."
 * PAID -> "Paid"
 * REFUNDED -> "Refunded"
 */
export function formatPaymentStatus(status) {
  if (!status) return 'Pending';
  switch (String(status).toUpperCase()) {
    case 'UNPAID':
      return "Unpaid — we'll confirm once payment is received.";
    case 'PAID':
      return 'Paid';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return String(status);
  }
}

/**
 * Format order status string for display
 */
export function formatOrderStatus(status) {
  if (!status) return 'Pending';
  const upper = String(status).toUpperCase();
  if (upper === 'PENDING') return 'Pending';
  if (upper === 'CONFIRMED') return 'Confirmed';
  if (upper === 'CANCELLED') return 'Cancelled';
  if (upper === 'COMPLETED') return 'Completed';
  return String(status);
}

/**
 * Check if an order qualifies for self-cancellation:
 * - Status is not CANCELLED
 * - Less than 2 hours since orderDate
 */
export function canCancelOrder(order) {
  if (!order || !order.orderDate) return false;
  if (String(order.status).toUpperCase() === 'CANCELLED') return false;
  const elapsed = Date.now() - new Date(order.orderDate).getTime();
  return elapsed < 2 * 60 * 60 * 1000;
}

/**
 * Get cancellation deadline Date (2 hours after orderDate)
 */
export function getCancelDeadline(orderDate) {
  if (!orderDate) return null;
  const d = new Date(orderDate);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 2 * 60 * 60 * 1000);
}

/**
 * Format cancellation deadline date into clean human-readable text
 */
export function formatDeadlineDate(dateObjOrStr) {
  if (!dateObjOrStr) return '';
  const d = new Date(dateObjOrStr);
  if (isNaN(d.getTime())) return '';
  const datePart = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} • ${timePart}`;
}

/**
 * Format order date into clean human-readable text
 */
export function formatOrderDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const datePart = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} • ${timePart} CET`;
}

/**
 * Shared OrderReceipt component used across both the Checkout Done step and OrderDetailPage.
 * Displays receipt breakdown with backend totals and status mappings.
 */
export default function OrderReceipt({ order, children }) {
  if (!order) return null;

  const items = order.orderItems || order.items || [];

  // Compute subtotal from line items
  const subtotal = items.reduce((sum, it) => {
    const qty = Number(it.quantity) || 1;
    const price = Number(it.price) || 0;
    const lineTotal = it.subTotal != null ? Number(it.subTotal) : (it.subtotal != null ? Number(it.subtotal) : price * qty);
    return sum + lineTotal;
  }, 0);

  // Directly use order.totalAmount from backend (backend total wins if they differ)
  const total = order.totalAmount != null ? Number(order.totalAmount) : subtotal;
  const cancelDeadline = getCancelDeadline(order.orderDate);

  return (
    <div className="mx-auto max-w-[640px] bg-[#F7F7F7] p-8 md:p-12 shadow-surface border border-line/60">
      {/* Receipt Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-ink">
          ORDER #{order.id}
        </h2>
        {order.orderDate && (
          <p className="text-xs text-muted font-mono tracking-tight mt-1">
            {formatOrderDate(order.orderDate)}
          </p>
        )}
      </div>

      {/* Order & Customer Details */}
      <div className="mb-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-4">
          SPECIFICATION DETAILS
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              ORDER STATUS
            </span>
            <span className="font-bold text-ink mt-0.5 block">
              {formatOrderStatus(order.status)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              PAYMENT METHOD
            </span>
            <span className="font-bold text-ink mt-0.5 block">
              {formatPaymentMethod(order.paymentMethod)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              PAYMENT STATUS
            </span>
            <span className="font-bold text-ink mt-0.5 block leading-snug">
              {formatPaymentStatus(order.paymentStatus)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              CANCELLATION DEADLINE
            </span>
            <span className="font-bold text-ink mt-0.5 block leading-snug">
              {cancelDeadline ? formatDeadlineDate(cancelDeadline) : 'N/A'}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              SHIPPING ADDRESS
            </span>
            <span className="text-ink mt-0.5 block leading-relaxed">
              {order.shippingAddress || 'No shipping address provided'}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized List */}
      <div className="pt-6 border-t border-line">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-4">
          ITEMS PURCHASED ({String(items.length).padStart(2, '0')})
        </span>

        <div className="space-y-4 divide-y divide-line/40">
          {items.map((item, idx) => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            const lineTotal = item.subTotal != null
              ? Number(item.subTotal)
              : (item.subtotal != null ? Number(item.subtotal) : price * qty);
            const name = item.productName || item.name || 'Artifact';

            return (
              <div
                key={item.id || idx}
                className="pt-3 first:pt-0 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink truncate">{name}</p>
                  <p className="text-[10px] text-muted font-mono">
                    Qty: {String(qty).padStart(2, '0')} × ${price.toFixed(2)}
                  </p>
                </div>
                <span className="text-xs font-bold text-ink shrink-0">
                  ${lineTotal.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="mt-8 pt-6 border-t border-line space-y-2.5 text-xs">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="font-bold text-ink">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Shipping</span>
          <span className="font-bold text-ink">Free</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Estimated Tax / VAT</span>
          <span className="font-bold text-ink">$0.00</span>
        </div>

        <div className="pt-4 mt-2 border-t border-line flex justify-between items-baseline">
          <span className="text-xs font-bold uppercase tracking-wider text-ink">
            TOTAL
          </span>
          <span className="text-xl md:text-2xl font-extrabold tracking-tight text-ink">
            ${total.toFixed(2)}{' '}
            <span className="text-sm font-normal text-muted">USD</span>
          </span>
        </div>
      </div>

      {children && <div className="mt-6 pt-6 border-t border-line">{children}</div>}
    </div>
  );
}
