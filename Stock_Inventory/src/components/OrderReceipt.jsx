
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
  const isPending = String(order.status || '').toUpperCase() === 'PENDING';
  if (!isPending) return false;
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

  // Subtotal from backend or fallback to computed items subtotal
  const calculatedItemsSubtotal = items.reduce((sum, it) => {
    const qty = Number(it.quantity) || 1;
    const price = Number(it.price) || 0;
    const lineTotal = it.subTotal != null ? Number(it.subTotal) : (it.subtotal != null ? Number(it.subtotal) : price * qty);
    return sum + lineTotal;
  }, 0);

  const subtotal = order.subtotal != null ? Number(order.subtotal) : calculatedItemsSubtotal;
  const shippingCost = order.shippingCost != null ? Number(order.shippingCost) : (subtotal >= 100 ? 0.0 : 5.0);
  const taxAmount = order.taxAmount != null ? Number(order.taxAmount) : Math.round(subtotal * 10) / 100;
  const total = order.totalAmount != null ? Number(order.totalAmount) : (subtotal + shippingCost + taxAmount);
  const cancelDeadline = getCancelDeadline(order.orderDate);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="printable-invoice" className="printable-invoice mx-auto max-w-[680px] bg-[#F7F7F7] p-6 sm:p-10 shadow-surface border border-line/60">
      {/* Store Header & Document Title */}
      <div className="border-b-2 border-ink pb-5 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted block">
            STOCK INVENTORY &bull; OFFICIAL SETTLEMENT
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink mt-0.5">
            TAX INVOICE & RECEIPT
          </h2>
        </div>
        <div className="sm:text-right">
          <span className="text-xs font-mono font-bold text-ink block">
            INVOICE #{order.id}
          </span>
          {order.orderDate && (
            <span className="text-[10px] text-muted font-mono block mt-0.5">
              {formatOrderDate(order.orderDate)}
            </span>
          )}
        </div>
      </div>

      {/* Order & Customer Specification Details */}
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-3">
          SPECIFICATION DETAILS
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
              ORDER STATUS
            </span>
            <span className="inline-block px-2.5 py-0.5 border border-ink text-[10px] font-bold uppercase tracking-wider text-ink bg-white">
              {formatOrderStatus(order.status)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
              PAYMENT STATUS
            </span>
            <span className="inline-block px-2.5 py-0.5 border border-ink text-[10px] font-bold uppercase tracking-wider text-ink bg-white">
              {order.paymentStatus || 'UNPAID'}
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
              CUSTOMER
            </span>
            <span className="font-bold text-ink mt-0.5 block font-mono">
              {order.username ? `@${order.username}` : (order.userId ? `User #${order.userId}` : 'N/A')}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              CONTACT PHONE
            </span>
            <span className="font-bold text-ink mt-0.5 block font-mono">
              {order.phone || 'N/A'}
            </span>
          </div>

          {cancelDeadline && String(order.status || '').toUpperCase() === 'PENDING' && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                CANCELLATION DEADLINE
              </span>
              <span className="font-bold text-ink mt-0.5 block leading-snug">
                {formatDeadlineDate(cancelDeadline)}
              </span>
            </div>
          )}

          <div className="sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              SHIPPING ADDRESS
            </span>
            <span className="text-ink mt-0.5 block leading-relaxed">
              {order.shippingAddress || 'No delivery address provided'}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="pt-5 border-t border-line">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-3">
          ITEMIZED MANIFEST ({String(items.length).padStart(2, '0')})
        </span>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse my-2">
            <thead>
              <tr className="border-b border-ink/40 text-[10px] font-bold uppercase tracking-wider text-muted">
                <th className="py-2.5 pr-4">Product</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 pl-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40 text-xs">
              {items.map((item, idx) => {
                const qty = Number(item.quantity) || 1;
                const price = Number(item.price) || 0;
                const lineTotal = item.subTotal != null
                  ? Number(item.subTotal)
                  : (item.subtotal != null ? Number(item.subtotal) : price * qty);
                const name = item.productName || item.name || 'Artifact';

                return (
                  <tr key={item.id || idx}>
                    <td className="py-3 pr-4 font-semibold text-ink">
                      {name}
                      {item.sku && <span className="block text-[10px] text-muted font-mono">{item.sku}</span>}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-ink">
                      {String(qty).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-muted">
                      ${price.toFixed(2)}
                    </td>
                    <td className="py-3 pl-4 text-right font-bold font-mono text-ink">
                      ${lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="mt-6 pt-5 border-t border-line space-y-2 text-xs">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="font-bold text-ink">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Shipping Cost</span>
          <span className="font-bold text-ink">
            {shippingCost === 0 ? 'FREE ($0.00)' : `$${shippingCost.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Tax (10%)</span>
          <span className="font-bold text-ink">${taxAmount.toFixed(2)}</span>
        </div>

        <div className="pt-3.5 mt-2 border-t border-line flex justify-between items-baseline">
          <span className="text-xs font-black uppercase tracking-wider text-ink">
            TOTAL AMOUNT
          </span>
          <span className="text-xl sm:text-2xl font-black tracking-tight text-ink">
            ${total.toFixed(2)}{' '}
            <span className="text-sm font-normal text-muted">USD</span>
          </span>
        </div>
      </div>

      {/* Prominent Download / Print Invoice PDF Button */}
      <div className="no-print pt-6 border-t border-line mt-6">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full h-11 bg-ink text-white text-xs font-bold uppercase tracking-[0.14em] hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zM7 9V5a2 2 0 012-2h6a2 2 0 012 2v4" />
          </svg>
          <span>Download / Print Invoice PDF</span>
        </button>
      </div>

      {/* Embedded Action Controls (hidden in print) */}
      {children && <div className="no-print mt-6 pt-6 border-t border-line">{children}</div>}
    </div>
  );
}
