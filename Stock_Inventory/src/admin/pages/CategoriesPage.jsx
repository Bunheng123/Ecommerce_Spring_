import { useEffect, useMemo, useState } from 'react';
import CategoryForm from '../components/CategoryForm';
import { AlertDialog, ConfirmDialog, Toast } from '../utils/swalConfig';
import { createCategory, forceDeleteCategory, fetchCategories, updateCategory } from '../../api/products';
import { getApiErrorMessage } from '../../api/stockMovements';

const PAGE_SIZE = 10;

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      setCategories(await fetchCategories());
    } catch (error) {
      await AlertDialog.fire({ title: 'Load Failed', text: getApiErrorMessage(error, 'Unable to load categories') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) =>
      `${category.id} ${category.name || ''} ${category.description || ''}`.toLowerCase().includes(query)
    );
  }, [categories, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const closeModal = () => setModal(null);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (modal?.mode === 'edit') {
        await updateCategory(modal.item.id, payload);
        Toast.fire({ icon: 'success', title: 'Category updated' });
      } else {
        await createCategory(payload);
        Toast.fire({ icon: 'success', title: 'Category created' });
      }
      closeModal();
      loadCategories();
    } catch (error) {
      await AlertDialog.fire({ title: 'Save Failed', text: getApiErrorMessage(error, 'Unable to save category') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    const result = await ConfirmDialog.fire({
      title: 'Delete Category?',
      text: 'This will permanently delete the category and force delete all products linked to it.',
      confirmButtonText: 'Force Delete',
    });
    if (!result.isConfirmed) return;

    try {
      await forceDeleteCategory(category.id);
      Toast.fire({ icon: 'success', title: 'Category deleted with products' });
      loadCategories();
    } catch (error) {
      await AlertDialog.fire({ title: 'Delete Failed', text: getApiErrorMessage(error, 'Unable to delete category') });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            TAXONOMY
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">Categories</h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">Create and maintain product classifications.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create', item: null })}
          className="h-12 px-6 rounded-2xl bg-neutral-950 text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-md shadow-neutral-900/10 self-start sm:self-auto cursor-pointer"
        >
          Add Category
        </button>
      </div>

      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Category Registry</h2>
            <span className="text-xs font-black bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full border border-neutral-200">
              {filtered.length} Total
            </span>
          </div>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search categories..."
            className="w-full sm:w-72 bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-4 py-2.5 outline-none focus:border-neutral-900 focus:bg-white transition-all"
          />
        </div>

        <div className="overflow-x-auto mt-4 max-h-[58vh]">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-neutral-100 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                <th className="py-4 px-4 whitespace-nowrap">ID</th>
                <th className="py-4 px-4 whitespace-nowrap">Name</th>
                <th className="py-4 px-4 whitespace-nowrap">Description</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {loading ? (
                <tr><td colSpan={4} className="py-12 text-center text-neutral-400 font-bold uppercase whitespace-nowrap">Loading categories...</td></tr>
              ) : pageItems.length > 0 ? pageItems.map((category) => (
                <tr key={category.id} className="hover:bg-[#F9FAFC] transition-colors">
                  <td className="py-4 px-4 font-mono font-black whitespace-nowrap">#{String(category.id).padStart(3, '0')}</td>
                  <td className="py-4 px-4 font-black text-neutral-900 whitespace-nowrap">{category.name}</td>
                  <td className="py-4 px-4 font-bold text-neutral-600 max-w-xl truncate">{category.description || 'No description'}</td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button type="button" onClick={() => setModal({ mode: 'view', item: category })} className="h-8 px-3 rounded-xl border border-neutral-200 text-[11px] font-black uppercase hover:bg-neutral-100 cursor-pointer whitespace-nowrap">View</button>
                      <button type="button" onClick={() => setModal({ mode: 'edit', item: category })} className="h-8 px-3 rounded-xl border border-neutral-200 text-[11px] font-black uppercase hover:bg-neutral-100 cursor-pointer whitespace-nowrap">Edit</button>
                      <button type="button" onClick={() => handleDelete(category)} className="h-8 px-3 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-black uppercase text-rose-700 hover:bg-rose-100 cursor-pointer whitespace-nowrap">Delete</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="py-12 text-center text-neutral-400 font-bold uppercase">No categories found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-5 mt-4 border-t border-neutral-100">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Page {safePage} of {pageCount}</span>
          <div className="flex gap-2">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="h-9 px-4 rounded-xl border border-neutral-200 text-[11px] font-black uppercase disabled:opacity-40 cursor-pointer">Previous</button>
            <button type="button" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="h-9 px-4 rounded-xl border border-neutral-200 text-[11px] font-black uppercase disabled:opacity-40 cursor-pointer">Next</button>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <CategoryForm
            mode={modal.mode}
            initialData={modal.item}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            isSubmitting={submitting}
          />
        </div>
      )}
    </div>
  );
}
