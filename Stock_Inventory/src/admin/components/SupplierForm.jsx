import { useState } from 'react';

/**
 * Shared SupplierForm component used across Create, Edit, and View flows.
 *
 * @param {'create' | 'edit' | 'view'} mode - Form mode
 * @param {Object|null} initialData - Supplier data object for edit/view, or null for create
 * @param {(data: Object) => void} onSubmit - Callback when form is submitted (create/edit)
 * @param {() => void} onCancel - Callback when form is cancelled or closed
 * @param {boolean} [isSubmitting] - Optional loading/submitting state flag
 */
export default function SupplierForm({
  mode = 'create',
  initialData = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState(() => {
    if (initialData && (isEdit || isView)) {
      return {
        name: initialData.name || '',
        contactPerson: initialData.contactPerson || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        address: initialData.address || '',
        active: initialData.active ?? true,
      };
    }
    return {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      active: true,
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isView) return;

    const payload = {
      name: formData.name.trim(),
      contactPerson: formData.contactPerson.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      active: formData.active,
    };

    if (onSubmit) {
      onSubmit(payload);
    }
  };

  const title = isCreate
    ? 'Add Supplier'
    : isEdit
    ? 'Edit Supplier'
    : 'Supplier Specification';

  const subtitle = isCreate
    ? 'Register a new inventory vendor or parts supplier'
    : isEdit
    ? `Update profile and contact details for ${initialData?.name || 'supplier'}`
    : `Read-only inspection for Supplier #${initialData?.id || '—'}`;

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-surface overflow-hidden flex flex-col max-h-[90vh]">
      {/* Modal Header */}
      <div className="p-6 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black uppercase tracking-wider text-neutral-900">
              {title}
            </h2>
            {(isEdit || isView) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border border-neutral-300 text-neutral-800 bg-white">
                {formData.active ? 'ACTIVE' : 'INACTIVE'}
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

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
        {/* Supplier Name */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Supplier Name {isView ? '' : '*'}
          </label>
          <input
            type="text"
            required={!isView}
            disabled={isView}
            readOnly={isView}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Apex Industrial Supplies"
            className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
            }`}
          />
        </div>

        {/* Contact Person */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Contact Person
          </label>
          <input
            type="text"
            disabled={isView}
            readOnly={isView}
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            placeholder="e.g. Robert Vance"
            className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
            }`}
          />
        </div>

        {/* Phone & Email (2 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              disabled={isView}
              readOnly={isView}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. +855 12 345 678"
              className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
                isView
                  ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none'
                  : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
              }`}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled={isView}
              readOnly={isView}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. sales@apexsupplies.com"
              className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
                isView
                  ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none'
                  : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
              }`}
            />
          </div>
        </div>

        {/* Physical Address */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Physical / Dispatch Address
          </label>
          <textarea
            rows={2}
            disabled={isView}
            readOnly={isView}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g. Building 18, National Highway 4, Phnom Penh"
            className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none resize-none transition-all ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
            }`}
          />
        </div>

        {/* Active Status Toggle (in edit/create mode) */}
        {!isView && (
          <div className="pt-2 border-t border-neutral-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-0"
              />
              <span className="text-xs font-bold text-neutral-800">
                Active Supplier (eligible for new Purchase Orders)
              </span>
            </label>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-neutral-200/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-neutral-300 bg-white text-neutral-700 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isView ? 'Close' : 'Cancel'}
          </button>

          {!isView && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-neutral-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isCreate ? (
                'Add Supplier'
              ) : (
                'Save Changes'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
