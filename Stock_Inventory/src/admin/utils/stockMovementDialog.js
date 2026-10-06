import Swal from 'sweetalert2';
import { AlertDialog, Toast } from './swalConfig';
import { stockIn, stockOut, getApiErrorMessage } from '../../api/stockMovements';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function productOptions(products, selectedProductId) {
  return products
    .map((product) => {
      const selected = String(product.id) === String(selectedProductId) ? 'selected' : '';
      return `<option value="${product.id}" ${selected}>${escapeHtml(product.name)} (${product.stock ?? 0} units)</option>`;
    })
    .join('');
}

export async function openStockMovementDialog({
  mode = null,
  product = null,
  products = [],
  onSuccess,
}) {
  const fixedMode = Boolean(mode);
  const initialMode = mode || 'STOCK_IN';
  const title = fixedMode ? (initialMode === 'STOCK_IN' ? 'Stock In' : 'Stock Out') : 'Log Movement';
  const needsProductSelect = !product;
  const availableProducts = products.filter((item) => item?.id != null);

  if (needsProductSelect && availableProducts.length === 0) {
    await AlertDialog.fire({
      title: 'No Products Available',
      text: 'Load products before logging a stock movement.',
    });
    return;
  }

  const result = await Swal.fire({
    title,
    html: `
      <div class="space-y-3 text-left">
        ${
          fixedMode
            ? ''
            : `<label class="block">
                <span class="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Type</span>
                <select id="movement-type" class="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-800 outline-none focus:border-neutral-900">
                  <option value="STOCK_IN">Stock In</option>
                  <option value="STOCK_OUT">Stock Out</option>
                </select>
              </label>`
        }
        ${
          needsProductSelect
            ? `<label class="block">
                <span class="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Product</span>
                <select id="movement-product" class="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-800 outline-none focus:border-neutral-900">
                  ${productOptions(availableProducts)}
                </select>
              </label>`
            : `<div class="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <span class="block text-[10px] font-black uppercase tracking-wider text-neutral-400">Product</span>
                <span class="block text-xs font-black text-neutral-900">${escapeHtml(product.name)}</span>
                <span class="block text-[11px] font-bold text-neutral-500 mt-0.5">Current stock: ${product.stock ?? 0} units</span>
              </div>`
        }
        <label class="block">
          <span class="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Quantity</span>
          <input id="movement-quantity" type="number" min="1" step="1" class="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-800 outline-none focus:border-neutral-900" />
        </label>
        <label class="block">
          <span class="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Reason</span>
          <textarea id="movement-reason" rows="3" class="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 outline-none focus:border-neutral-900 resize-none"></textarea>
        </label>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: title,
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    focusConfirm: false,
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-xl border border-neutral-200 shadow-md font-sans',
      title: 'text-sm font-black uppercase tracking-wider text-neutral-900 pt-2',
      htmlContainer: 'text-xs text-neutral-600 font-medium',
      confirmButton: 'h-9 px-5 bg-neutral-900 text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none',
      cancelButton: 'h-9 px-5 bg-white text-neutral-900 border border-neutral-300 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-neutral-50 hover:border-neutral-900 transition-colors cursor-pointer focus:outline-none',
      actions: 'gap-2 mt-1',
    },
    preConfirm: () => {
      const selectedProductId = needsProductSelect
        ? document.getElementById('movement-product')?.value
        : product.id;
      const selectedMode = fixedMode ? initialMode : document.getElementById('movement-type')?.value;
      const quantity = Number(document.getElementById('movement-quantity')?.value);
      const reason = document.getElementById('movement-reason')?.value?.trim();

      if (!selectedProductId) {
        Swal.showValidationMessage('Product is required');
        return false;
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        Swal.showValidationMessage('Quantity must be a positive whole number');
        return false;
      }
      if (!reason) {
        Swal.showValidationMessage('Reason is required');
        return false;
      }

      return { productId: selectedProductId, mode: selectedMode, quantity, reason };
    },
  });

  if (!result.isConfirmed || !result.value) return;

  try {
    const isStockIn = result.value.mode === 'STOCK_IN';
    const action = isStockIn ? stockIn : stockOut;
    const actionTitle = isStockIn ? 'Stock In' : 'Stock Out';
    const updatedProduct = await action(result.value.productId, {
      quantity: result.value.quantity,
      reason: result.value.reason,
    });

    await Toast.fire({
      icon: 'success',
      title: `${actionTitle} logged`,
    });

    await onSuccess?.(updatedProduct);
  } catch (error) {
    const actionTitle = result.value.mode === 'STOCK_IN' ? 'Stock In' : 'Stock Out';
    await AlertDialog.fire({
      title: `${actionTitle} Failed`,
      text: getApiErrorMessage(error, `${actionTitle} failed`),
    });
  }
}
