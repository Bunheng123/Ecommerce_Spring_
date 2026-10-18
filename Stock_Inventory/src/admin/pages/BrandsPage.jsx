import { useEffect, useMemo, useState } from 'react';
import BrandForm from '../components/BrandForm';
import { AlertDialog, ConfirmDialog, Toast } from '../utils/swalConfig';
import { fetchBrands, createBrand, updateBrand, deleteBrand } from '../../api/brands';
import { getApiErrorMessage } from '../../api/stockMovements';

const PAGE_SIZE = 10;

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const data = await fetchBrands();
      setBrands(Array.isArray(data) ? data : []);
    } catch (error) {
      await AlertDialog.fire({
        title: 'Load Failed',
        text: getApiErrorMessage(error, 'Unable to load brands'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return brands;
    return brands.filter((brand) =>
      `${brand.id} ${brand.name || ''} ${brand.description || ''}`.toLowerCase().includes(query)
    );
  }, [brands, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalProductsLinked = useMemo(() => {
    return brands.reduce((acc, b) => acc + (Number(b.productCount) || 0), 0);
  }, [brands]);

  const activeBrandsCount = useMemo(() => {
    return brands.filter((b) => (Number(b.productCount) || 0) > 0).length;
  }, [brands]);

  const closeModal = () => setModal(null);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (modal?.mode === 'edit') {
        await updateBrand(modal.item.id, payload);
        Toast.fire({ icon: 'success', title: 'Brand updated' });
      } else {
        await createBrand(payload);
        Toast.fire({ icon: 'success', title: 'Brand created' });
      }
      closeModal();
      loadBrands();
    } catch (error) {
      await AlertDialog.fire({
        title: 'Save Failed',
        text: getApiErrorMessage(error, 'Unable to save brand'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (brand) => {
    const result = await ConfirmDialog.fire({
      title: 'Delete Brand?',
      text: `Are you sure you want to delete "${brand.name}"? Any linked products will have their brand cleared.`,
      confirmButtonText: 'Yes, Delete Brand',
    });
    if (!result.isConfirmed) return;

    try {
      await deleteBrand(brand.id);
      Toast.fire({ icon: 'success', title: 'Brand deleted and products unlinked' });
      loadBrands();
    } catch (error) {
      await AlertDialog.fire({
        title: 'Delete Failed',
        text: getApiErrorMessage(error, 'Unable to delete brand'),
      });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            TAXONOMY
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">Brands</h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Manage product manufacturers, brand labels, and storefront catalog filters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create', item: null })}
          className="h-12 px-6 rounded-2xl bg-neutral-950 text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-md shadow-neutral-900/10 self-start sm:self-auto cursor-pointer"
        >
          Add Brand
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-surface">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            TOTAL BRANDS
          </span>
          <div className="text-3xl font-black tracking-tight text-neutral-900">{brands.length}</div>
          <p className="text-xs font-bold text-neutral-400 mt-1">Configured brand labels</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-surface">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            ACTIVE IN CATALOG
          </span>
          <div className="text-3xl font-black tracking-tight text-neutral-900">{activeBrandsCount}</div>
          <p className="text-xs font-bold text-neutral-400 mt-1">Brands with assigned products</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-surface">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            LINKED PRODUCTS
          </span>
          <div className="text-3xl font-black tracking-tight text-neutral-900">{totalProductsLinked}</div>
          <p className="text-xs font-bold text-neutral-400 mt-1">Total items tagged with a brand</p>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Brand Registry</h2>
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
            placeholder="Search brands..."
            className="w-full sm:w-72 bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-4 py-2.5 outline-none focus:border-neutral-900 focus:bg-white transition-all"
          />
        </div>

        <div className="overflow-x-auto mt-4 max-h-[58vh]">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-neutral-100 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                <th className="py-4 px-4 whitespace-nowrap">ID</th>
                <th className="py-4 px-4 whitespace-nowrap">Brand Name</th>
                <th className="py-4 px-4 whitespace-nowrap">Description</th>
                <th className="py-4 px-4 whitespace-nowrap">Products</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400 font-bold uppercase whitespace-nowrap">
                    Loading brands...
                  </td>
                </tr>
              ) : pageItems.length > 0 ? (
                pageItems.map((brand) => (
                  <tr key={brand.id} className="hover:bg-[#F9FAFC] transition-colors">
                    <td className="py-4 px-4 font-mono font-black whitespace-nowrap">
                      #{String(brand.id).padStart(3, '0')}
                    </td>
                    <td className="py-4 px-4 font-black text-neutral-900 whitespace-nowrap">
                      {brand.name}
                    </td>
                    <td className="py-4 px-4 font-bold text-neutral-600 max-w-xl truncate">
                      {brand.description || 'No description'}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700">
                        {brand.productCount ?? 0} {brand.productCount === 1 ? 'item' : 'items'}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setModal({ mode: 'view', item: brand })}
                          className="h-8 px-3 rounded-xl border border-neutral-200 text-[11px] font-black uppercase hover:bg-neutral-100 cursor-pointer whitespace-nowrap"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal({ mode: 'edit', item: brand })}
                          className="h-8 px-3 rounded-xl border border-neutral-200 text-[11px] font-black uppercase hover:bg-neutral-100 cursor-pointer whitespace-nowrap"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(brand)}
                          className="h-8 px-3 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-black uppercase text-rose-700 hover:bg-rose-100 cursor-pointer whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400 font-bold uppercase">
                    No brands found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-5 mt-4 border-t border-neutral-100">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Page {safePage} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-9 px-4 rounded-xl border border-neutral-200 text-[11px] font-black uppercase disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="h-9 px-4 rounded-xl border border-neutral-200 text-[11px] font-black uppercase disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <BrandForm
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
