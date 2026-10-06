import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import ProductForm from '../components/ProductForm';
import StatusBadge from '../components/StatusBadge';
import { AlertDialog, ConfirmDialog, Toast } from '../utils/swalConfig';
import { openStockMovementDialog } from '../utils/stockMovementDialog';
import {
  activateProduct,
  addProductImage,
  createProduct,
  deleteProduct,
  deleteProductImage,
  fetchCategories,
  fetchLowStockProducts,
  fetchProductImages,
  fetchAdminProducts,
  hardDeleteProduct,
  updateProduct,
} from '../../api/products';
import { getApiErrorMessage } from '../../api/stockMovements';

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [productData, categoryData] = await Promise.all([
        stockFilter === 'LOW' ? fetchLowStockProducts() : fetchAdminProducts(),
        fetchCategories(),
      ]);
      setProducts(productData);
      setCategories(categoryData);
    } catch (error) {
      await AlertDialog.fire({ title: 'Load Failed', text: getApiErrorMessage(error, 'Unable to load products') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [stockFilter]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !query || `${product.name || ''} ${product.categoryName || ''} ${product.id}`.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === 'ALL' || String(product.categoryId) === String(categoryFilter);
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openModal = async (mode, product = null) => {
    setModal({ mode, item: product });
    setGalleryImages([]);
    if (product?.id && (mode === 'edit' || mode === 'view')) {
      setGalleryLoading(true);
      try {
        setGalleryImages(await fetchProductImages(product.id));
      } catch (error) {
        await AlertDialog.fire({ title: 'Gallery Load Failed', text: getApiErrorMessage(error, 'Unable to load product images') });
      } finally {
        setGalleryLoading(false);
      }
    }
  };

  const closeModal = () => {
    setModal(null);
    setGalleryImages([]);
    setGalleryLoading(false);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (modal?.mode === 'edit') {
        await updateProduct(modal.item.id, payload);
        Toast.fire({ icon: 'success', title: 'Product updated' });
      } else {
        await createProduct(payload);
        Toast.fire({ icon: 'success', title: 'Product created' });
      }
      closeModal();
      loadProducts();
    } catch (error) {
      AlertDialog.fire({ title: 'Save Failed', text: getApiErrorMessage(error, 'Unable to save product') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (product) => {
    const isCurrentlyActive = product.active !== false;
    try {
      if (isCurrentlyActive) {
        await deleteProduct(product.id);
        Toast.fire({ icon: 'success', title: 'Product deactivated' });
      } else {
        await activateProduct(product.id);
        Toast.fire({ icon: 'success', title: 'Product activated' });
      }
      loadProducts();
    } catch (error) {
      AlertDialog.fire({
        title: isCurrentlyActive ? 'Deactivation Failed' : 'Activation Failed',
        text: getApiErrorMessage(error, 'Unable to update product status'),
      });
    }
  };

  const handleDelete = async (product) => {
    const result = await ConfirmDialog.fire({
      title: 'Delete Product?',
      text: `Permanently delete "${product.name}"? This action cannot be undone.`,
      confirmButtonText: 'Yes, Delete',
    });
    if (!result.isConfirmed) return;

    try {
      await hardDeleteProduct(product.id);
      Toast.fire({ icon: 'success', title: 'Product permanently deleted' });
      loadProducts();
    } catch (error) {
      AlertDialog.fire({ title: 'Delete Failed', text: getApiErrorMessage(error, 'Unable to delete product') });
    }
  };

  const handleAddGalleryImages = async (files) => {
    if (!modal?.item?.id || !files || files.length === 0) return;
    setGalleryBusy(true);
    let successCount = 0;
    const errors = [];
    try {
      for (const file of files) {
        try {
          await addProductImage(modal.item.id, file);
          successCount++;
        } catch (err) {
          errors.push(err);
        }
      }
      setGalleryImages(await fetchProductImages(modal.item.id));
      if (successCount > 0) {
        await Toast.fire({
          icon: 'success',
          title: successCount === 1 ? '1 image uploaded' : `${successCount} images uploaded successfully`,
        });
      }
      if (errors.length > 0) {
        await AlertDialog.fire({
          title: 'Upload Notice',
          text: `Failed to upload ${errors.length} of ${files.length} images: ${getApiErrorMessage(errors[0])}`,
        });
      }
    } catch (error) {
      await AlertDialog.fire({ title: 'Upload Failed', text: getApiErrorMessage(error, 'Unable to upload images') });
    } finally {
      setGalleryBusy(false);
    }
  };

  const handleDeleteGalleryImage = async (image) => {
    if (!modal?.item?.id) return;
    setGalleryBusy(true);
    try {
      await deleteProductImage(modal.item.id, image.id);
      setGalleryImages(await fetchProductImages(modal.item.id));
      await Toast.fire({ icon: 'success', title: 'Image deleted' });
    } catch (error) {
      await AlertDialog.fire({ title: 'Delete Failed', text: getApiErrorMessage(error, 'Unable to delete image') });
    } finally {
      setGalleryBusy(false);
    }
  };

  const handleStockMovement = (mode, product) => {
    openStockMovementDialog({
      mode,
      product,
      onSuccess: async (updatedProduct) => {
        if (updatedProduct && modal?.item?.id === updatedProduct.id) {
          setModal((current) => current ? { ...current, item: updatedProduct } : current);
        }
        await loadProducts();
      },
    });
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const resetPaging = () => setPage(1);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            CATALOG MANAGEMENT
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">Products</h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">Manage product records, images, and manual stock actions.</p>
        </div>
        <button type="button" onClick={() => openModal('create')} className="h-12 px-6 rounded-2xl bg-neutral-950 text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-md shadow-neutral-900/10 self-start sm:self-auto cursor-pointer">
          Add Product
        </button>
      </div>

      <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-surface">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Product Catalog</h2>
            <span className="text-xs font-black bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full border border-neutral-200">{filtered.length} Items</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto">
            <input value={search} onChange={(event) => { setSearch(event.target.value); resetPaging(); }} placeholder="Search products..." className="h-10 min-w-64 bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3 outline-none focus:border-neutral-900 focus:bg-white" />
            <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); resetPaging(); }} className="h-10 min-w-52 bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3 outline-none focus:border-neutral-900 focus:bg-white">
              <option value="ALL">All Categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={stockFilter} onChange={(event) => { setStockFilter(event.target.value); resetPaging(); }} className="h-10 min-w-44 bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3 outline-none focus:border-neutral-900 focus:bg-white">
              <option value="ALL">All Stock</option>
              <option value="LOW">Low Stock</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto mt-4 max-h-[58vh]">
          <table className="w-full min-w-[960px] text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-neutral-100 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
                <th className="py-4 px-4 whitespace-nowrap">Thumbnail</th>
                <th className="py-4 px-4 whitespace-nowrap">Name</th>
                <th className="py-4 px-4 whitespace-nowrap">Category</th>
                <th className="py-4 px-4 whitespace-nowrap">Price</th>
                <th className="py-4 px-4 whitespace-nowrap">Stock</th>
                <th className="py-4 px-4 whitespace-nowrap">Active</th>
                <th className="py-4 px-4 whitespace-nowrap">Deactivated At</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`products-skeleton-${idx}`} className="animate-pulse">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="h-12 w-12 rounded-xl bg-neutral-200/80" />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="h-4 w-36 bg-neutral-200/80 rounded-sm mb-1.5" />
                      <div className="h-2.5 w-16 bg-neutral-200/50 rounded-xs" />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="h-3.5 w-20 bg-neutral-200/70 rounded-xs" />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="h-3.5 w-14 bg-neutral-200/80 rounded-xs" />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="h-3.5 w-20 bg-neutral-200/70 rounded-xs" />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="h-5 w-16 bg-neutral-200/70 rounded-full" />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="h-3 w-24 bg-neutral-200/60 rounded-xs" />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-8 w-12 bg-neutral-200/70 rounded-xl" />
                        <div className="h-8 w-12 bg-neutral-200/70 rounded-xl" />
                        <div className="h-8 w-16 bg-neutral-200/70 rounded-xl" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : pageItems.length > 0 ? pageItems.map((product) => {
                const isLow = Number(product.stock ?? 0) <= Number(product.reorderLevel ?? -1);
                return (
                  <tr key={product.id} className="hover:bg-[#F9FAFC] transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="h-12 w-12 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center">
                        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <span className="text-[10px] font-black text-neutral-400">SI</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-black text-sm text-neutral-900 block">{product.name}</span>
                      <span className="text-[10px] font-mono text-neutral-400">ID #{product.id}</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-neutral-700 whitespace-nowrap">{product.categoryName || 'General'}</td>
                    <td className="py-4 px-4 font-black text-neutral-900 whitespace-nowrap">${Number(product.price || 0).toFixed(2)}</td>
                    <td className="py-4 px-4 font-black text-neutral-900 whitespace-nowrap">
                      {product.stock ?? 0} units{isLow ? ' (Low)' : ''}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap"><StatusBadge status={product.active === false ? 'INACTIVE' : 'ACTIVE'} /></td>
                    <td className="py-4 px-4 font-mono font-bold text-neutral-500 whitespace-nowrap">{formatDate(product.deactivatedAt)}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button type="button" onClick={() => openModal('view', product)} className="h-8 px-3 rounded-xl border border-neutral-200 text-[11px] font-black uppercase hover:bg-neutral-100 cursor-pointer whitespace-nowrap">View</button>
                        <button type="button" onClick={() => openModal('edit', product)} className="h-8 px-3 rounded-xl border border-neutral-200 text-[11px] font-black uppercase hover:bg-neutral-100 cursor-pointer whitespace-nowrap">Edit</button>
                        {product.active === false ? (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(product)}
                            className="h-8 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-[11px] font-black uppercase text-emerald-700 hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(product)}
                            className="h-8 px-3 rounded-xl border border-amber-200 bg-amber-50 text-[11px] font-black uppercase text-amber-800 hover:bg-amber-100 cursor-pointer whitespace-nowrap"
                          >
                            Deactivate
                          </button>
                        )}
                        <button type="button" onClick={() => handleDelete(product)} className="h-8 px-3 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-black uppercase text-rose-700 hover:bg-rose-100 cursor-pointer whitespace-nowrap">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="py-12 text-center text-neutral-400 font-bold uppercase">No products found</td></tr>
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
          <ProductForm
            mode={modal.mode}
            initialData={modal.item}
            categories={categories}
            galleryImages={galleryImages}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            onAddGalleryImage={(file) => handleAddGalleryImages([file])}
            onAddGalleryImages={handleAddGalleryImages}
            onDeleteGalleryImage={handleDeleteGalleryImage}
            onStockIn={() => handleStockMovement('STOCK_IN', modal.item)}
            onStockOut={() => handleStockMovement('STOCK_OUT', modal.item)}
            isSubmitting={submitting}
            isGalleryBusy={galleryBusy}
            isGalleryLoading={galleryLoading}
          />
        </div>
      )}
    </div>
  );
}
