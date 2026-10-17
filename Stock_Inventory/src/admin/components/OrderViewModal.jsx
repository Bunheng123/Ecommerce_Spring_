import OrderReceipt from '../../components/OrderReceipt';

/**
 * Shared modal component to inspect customer order receipts and specifications.
 * Wraps the existing OrderReceipt component inside a responsive admin modal dialog.
 *
 * @param {Object|null} order - The order object to display
 * @param {boolean} isOpen - Whether the modal is open
 * @param {() => void} onClose - Callback to close the modal
 */
export default function OrderViewModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block">
              Customer Order Receipt
            </span>
            <h3 className="text-lg font-black uppercase tracking-tight text-neutral-900 mt-0.5">
              Order #{order.id}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="Print Receipt"
              className="h-8 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zM7 9V5a2 2 0 012-2h6a2 2 0 012 2v4" />
              </svg>
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FBFBFC]">
          <OrderReceipt order={order} />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-white">
          <span className="text-xs font-bold text-neutral-400">
            Customer: <strong className="text-neutral-900 font-mono">@{order.username || `user-${order.userId}`}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
