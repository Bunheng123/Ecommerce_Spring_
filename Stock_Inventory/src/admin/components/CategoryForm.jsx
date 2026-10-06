import { useEffect, useState } from 'react';

export default function CategoryForm({
  mode = 'create',
  initialData = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (initialData && (isEdit || isView)) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [initialData, isEdit, isView]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isView) return;
    onSubmit?.({
      name: formData.name.trim(),
      description: formData.description.trim(),
    });
  };

  const title = mode === 'create' ? 'Create Category' : isEdit ? 'Edit Category' : 'View Category';

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-[#FAFBFD]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-0.5">
            CATEGORY MANAGEMENT
          </span>
          <h3 className="text-lg font-black uppercase tracking-tight text-neutral-900">{title}</h3>
          <p className="text-xs font-bold text-neutral-400 mt-0.5">
            Name and describe a catalog classification.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-neutral-400 hover:text-neutral-900 text-xl font-bold p-1 cursor-pointer transition-colors leading-none"
          title="Close dialog"
        >
          &times;
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Name {isView ? '' : '*'}
          </label>
          <input
            type="text"
            required={!isView}
            disabled={isView}
            readOnly={isView}
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white'
            }`}
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Description
          </label>
          <textarea
            rows={4}
            disabled={isView}
            readOnly={isView}
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.target.value })}
            className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all resize-none ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white'
            }`}
          />
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-10 px-4 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold uppercase hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isView ? 'Close' : 'Cancel'}
          </button>
          {!isView && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-6 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Category'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
