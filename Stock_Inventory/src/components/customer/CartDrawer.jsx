import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export default function CartDrawer() {
  const navigate = useNavigate();
  const {
    isDrawerOpen,
    closeDrawer,
    items,
    itemCount,
    subtotal,
    updateQuantity,
    removeItem,
  } = useCart();

  if (!isDrawerOpen) return null;

  const handleCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  return (
    <div className="relative z-[9999]">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity cursor-pointer"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[440px] bg-white shadow-2xl flex flex-col z-[10000] animate-slideLeft">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-ink">
            SHOPPING CART ({itemCount})
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="p-1 text-ink hover:opacity-60 transition-opacity text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-line">
          {items.length === 0 ? (
            <div className="p-16 text-center text-muted flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 mb-4 border border-line bg-[#FAFAFA] flex items-center justify-center text-ink">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                </svg>
              </div>
              <p className="text-xs uppercase font-bold tracking-wider mb-4 text-ink">
                Your shopping cart is empty
              </p>
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  navigate('/shop');
                }}
                className="border border-ink bg-ink text-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {items.map((item) => (
                <div key={item.id} className="p-4 flex gap-4 items-start">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 flex-shrink-0 bg-[#FAFAFA] border border-line flex items-center justify-center p-1.5">
                    {item.productImageUrl ? (
                      <img
                        src={item.productImageUrl}
                        alt={item.productName}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[8px] uppercase font-bold text-subtle">
                        No Img
                      </span>
                    )}
                  </div>

                  {/* Info & Quantity */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full gap-2">
                    <div>
                      {/* Clean Unit Price without discount */}
                      <span className="text-xs font-bold text-ink">
                        ${Number(item.price).toFixed(2)}
                      </span>
                      <h3 className="text-xs font-bold text-ink leading-snug line-clamp-2 mt-0.5">
                        {item.productName}
                      </h3>
                      {item.variantDetails && (
                        <p className="text-[10px] text-muted line-clamp-1 mt-0.5">
                          {item.variantDetails}
                        </p>
                      )}
                    </div>

                    {/* Stepper & Remove */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="inline-flex items-center border border-line bg-white">
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-xs text-ink hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="px-2.5 py-1 text-xs font-bold text-ink min-w-[22px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-xs text-ink hover:bg-neutral-100 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-[11px] font-bold uppercase tracking-wider text-muted hover:text-ink underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Fixed Checkout Bar (Only clean Total Price, no discount) */}
        <div className="p-5 border-t border-line bg-white flex items-center justify-between gap-6 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
              TOTAL
            </span>
            <div className="text-xl font-extrabold tracking-tight text-ink">
              ${subtotal.toFixed(2)}{' '}
              <span className="text-xs font-normal text-muted">USD</span>
            </div>
          </div>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={handleCheckout}
            className="flex-1 max-w-[220px] h-12 bg-ink text-white text-xs font-bold uppercase tracking-[0.14em] hover:bg-neutral-800 transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
