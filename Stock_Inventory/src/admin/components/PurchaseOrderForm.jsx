import { useState, useMemo } from 'react';

/**
 * Shared PurchaseOrderForm component supporting Create mode and read-only View mode.
 * NOTE: Per business rules, Purchase Orders can only be created, viewed, received, or cancelled.
 * There is NO edit flow.
 *
 * @param {'create' | 'view'} mode - Form mode ('create' | 'view')
 * @param {Object|null} initialData - Purchase order object for view, or null for create
 * @param {(data: Object) => void} onSubmit - Callback when form is submitted (create)
 * @param {() => void} onCancel - Callback when form is cancelled or closed
 * @param {boolean} [isSubmitting] - Optional loading/submitting state flag
 * @param {Array} [suppliers] - List of suppliers for dropdown selection
 * @param {Array} [products] - List of products for line items selection
 */
export default function PurchaseOrderForm({
  mode = 'create',
  initialData = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  suppliers = [],
  products = [],
}) {
  const isView = mode === 'view';
  const isCreate = mode === 'create';

  // Active suppliers eligible for new purchase orders
  const activeSuppliers = useMemo(() => {
    return suppliers.filter((s) => s.active);
  }, [suppliers]);

  // Create Mode State
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([
    { productId: '', quantity: 1, costPrice: 0 },
  ]);
  const [validationError, setValidationError] = useState('');

  // When product changes in a line item, auto-fill unit costPrice from product catalog if available
  const handleProductChange = (index, prodId) => {
    const selectedProd = products.find((p) => String(p.id) === String(prodId));
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: prodId,
        costPrice: selectedProd ? Number(selectedProd.costPrice || selectedProd.price || 0) : updated[index].costPrice,
      };
      return updated;
    });
  };

  const handleQuantityChange = (index, qty) => {
    const parsed = Math.max(1, parseInt(qty, 10) || 1);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: parsed };
      return updated;
    });
  };

  const handleCostPriceChange = (index, cost) => {
    const parsed = Math.max(0, parseFloat(cost) || 0);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], costPrice: parsed };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1, costPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live order calculations
  const totalCost = useMemo(() => {
    if (isView && initialData) {
      return Number(initialData.totalCost || 0);
    }
    return items.reduce((acc, it) => {
      const q = Number(it.quantity) || 0;
      const c = Number(it.costPrice) || 0;
      return acc + q * c;
    }, 0);
  }, [isView, initialData, items]);

  const totalQuantity = useMemo(() => {
    if (isView && initialData?.items) {
      return initialData.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    }
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  }, [isView, initialData, items]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isView) return;

    setValidationError('');

    if (!supplierId) {
      setValidationError('Please select a supplier.');
      return;
    }

    if (items.length === 0) {
      setValidationError('At least one line item is required.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        setValidationError(`Please select a product for line item #${i + 1}.`);
        return;
      }
      if (it.quantity < 1) {
        setValidationError(`Quantity for line item #${i + 1} must be at least 1.`);
        return;
      }
      if (it.costPrice < 0) {
        setValidationError(`Cost price for line item #${i + 1} cannot be negative.`);
        return;
      }
    }

    const payload = {
      supplierId: Number(supplierId),
      items: items.map((it) => ({
        productId: Number(it.productId),
        quantity: Number(it.quantity),
        costPrice: Number(it.costPrice),
      })),
    };

    if (onSubmit) {
      onSubmit(payload);
    }
  };

  const title = isCreate ? 'New Purchase Order' : `Purchase Order #${initialData?.id || '—'}`;
  const subtitle = isCreate
    ? 'Issue an official inventory restocking request to an active vendor'
    : `Historical audit record created by @${initialData?.createdByUsername || 'admin'}`;

  const status = isView ? String(initialData?.status || 'PENDING').toUpperCase() : 'PENDING';

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-surface overflow-hidden flex flex-col max-h-[92vh]">
      {/* Modal Header */}
      <div className="p-6 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/50">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-black uppercase tracking-wider text-neutral-900">
              {title}
            </h2>
            {isView && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border border-neutral-300 text-neutral-800 bg-white">
                {status}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Close modal"
          className="w-8 h-8 rounded-full border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-900 flex items-center justify-center transition-all cursor-pointer text-sm font-bold"
        >
          ✕
        </button>
      </div>

      {/* VIEW MODE: Read-Only Order Audit */}
      {isView && initialData ? (
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                Supplier
              </span>
              <span className="text-xs font-black text-neutral-900 block truncate">
                {initialData.supplierName || `Supplier #${initialData.supplierId}`}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                Order Date
              </span>
              <span className="text-xs font-mono font-bold text-neutral-800 block">
                {initialData.orderDate
                  ? new Date(initialData.orderDate).toLocaleString()
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                Created By
              </span>
              <span className="text-xs font-mono font-bold text-neutral-800 block">
                @{initialData.createdByUsername || 'admin'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
                Total Valuation
              </span>
              <span className="text-xs font-mono font-black text-neutral-900 block">
                ${totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                Order Line Items ({initialData.items?.length || 0})
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                Total Units: <strong className="text-neutral-900">{totalQuantity}</strong>
              </span>
            </div>

            <div className="border border-neutral-200/80 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#FAFBFD] border-b border-neutral-200 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Item #</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Unit Cost</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {initialData.items && initialData.items.length > 0 ? (
                    initialData.items.map((item, index) => {
                      const subtotal = item.subtotal ?? (item.quantity * item.costPrice);
                      return (
                        <tr key={item.id || index} className="hover:bg-neutral-50/60">
                          <td className="px-4 py-3 font-mono text-neutral-400 font-bold">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-neutral-900">
                              {item.productName || `Product #${item.productId}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-neutral-800">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-700">
                            ${Number(item.costPrice).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-black text-neutral-900">
                            ${Number(subtotal).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-neutral-400 font-mono">
                        No items recorded in this order.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[#FAFBFD] border-t border-neutral-200 font-black">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-[11px] uppercase tracking-wider text-neutral-700">
                      Total Valuation
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-900">
                      {totalQuantity}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-neutral-900">
                      ${totalCost.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-neutral-200/80 flex items-center justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 border border-neutral-300 bg-white text-neutral-800 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        /* CREATE MODE: Supplier Selection & Dynamic Line Items */
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5" noValidate>
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
              <span>⚠</span>
              <span>{validationError}</span>
            </div>
          )}

          {activeSuppliers.length === 0 && (
            <div className="p-3.5 bg-neutral-100 border border-neutral-300 rounded-xl text-neutral-800 text-xs font-bold">
              ⚠ No active suppliers available. Please activate or add a supplier first before creating a purchase order.
            </div>
          )}

          {/* Supplier Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
              Select Active Supplier *
            </label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full text-xs font-bold rounded-xl px-3.5 py-2.5 bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white outline-none transition-all cursor-pointer"
            >
              <option value="">-- Choose Supplier --</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''} — #{s.id}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Line Items Section */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-neutral-700">
                Purchase Order Line Items ({items.length})
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-[10px] font-black uppercase tracking-wider rounded-lg border border-neutral-200 transition-colors cursor-pointer"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.costPrice) || 0);
                const selectedProd = products.find((p) => String(p.id) === String(item.productId));
                const retailPrice = selectedProd ? Number(selectedProd.price || 0) : 0;
                const costPriceNum = Number(item.costPrice || 0);
                const isCostExceedsRetail = selectedProd && retailPrice > 0 && costPriceNum > retailPrice;

                return (
                  <div
                    key={index}
                    className="p-3.5 bg-[#FBFBFC] border border-neutral-200 rounded-xl flex flex-col gap-2"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {/* Item Number */}
                      <span className="font-mono text-xs font-black text-neutral-400 shrink-0">
                        #{index + 1}
                      </span>

                      {/* Product Selector */}
                      <div className="flex-1 min-w-[180px]">
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          className="w-full text-xs font-bold rounded-lg px-2.5 py-2 bg-white border border-neutral-200 text-neutral-800 focus:border-neutral-900 outline-none transition-all cursor-pointer"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock: {p.stock ?? 0}, Retail: ${Number(p.price || 0).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="w-24 shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            placeholder="Qty"
                            className="w-full text-xs font-mono font-bold rounded-lg px-2.5 py-2 bg-white border border-neutral-200 text-neutral-800 focus:border-neutral-900 outline-none"
                          />
                        </div>
                        <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mt-0.5">
                          Units
                        </span>
                      </div>

                      {/* Unit Cost Price */}
                      <div className="w-28 shrink-0">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-neutral-400 font-mono text-xs font-bold">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.costPrice}
                            onChange={(e) => handleCostPriceChange(index, e.target.value)}
                            placeholder="0.00"
                            className="w-full text-xs font-mono font-bold rounded-lg pl-6 pr-2.5 py-2 bg-white border border-neutral-200 text-neutral-800 focus:border-neutral-900 outline-none"
                          />
                        </div>
                        <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mt-0.5">
                          Unit Cost
                        </span>
                      </div>

                      {/* Line Subtotal */}
                      <div className="w-24 text-right shrink-0">
                        <span className="font-mono text-xs font-black text-neutral-900 block">
                          ${lineSubtotal.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mt-0.5">
                          Subtotal
                        </span>
                      </div>

                      {/* Remove Item Button */}
                      <div className="shrink-0 flex items-center justify-end">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(index)}
                          className="w-7 h-7 rounded-lg border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-300 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove line item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {isCostExceedsRetail && (
                      <div className="text-[11px] text-neutral-900 font-bold pl-7 flex items-center gap-1.5 bg-neutral-100 border border-neutral-300 rounded-lg py-1.5 px-2.5">
                        <span>⚠</span>
                        <span>
                          Notice: Supplier unit cost (${costPriceNum.toFixed(2)}) exceeds current retail selling price (${retailPrice.toFixed(2)}).
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Order Summary Footer Card */}
          <div className="p-4 bg-neutral-900 text-white rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block">
                Estimated Order Valuation
              </span>
              <span className="text-xs text-neutral-300 font-medium">
                {items.length} line item{items.length === 1 ? '' : 's'} &bull; {totalQuantity} total units
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl font-mono font-black text-white block">
                ${totalCost.toFixed(2)}
              </span>
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
                USD TOTAL
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-neutral-200/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-neutral-300 bg-white text-neutral-700 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || activeSuppliers.length === 0}
              className="px-5 py-2 bg-neutral-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Issuing Order...</span>
                </>
              ) : (
                'Create Purchase Order'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
