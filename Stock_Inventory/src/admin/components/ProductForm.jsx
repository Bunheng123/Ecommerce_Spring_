import { useEffect, useRef, useState } from 'react';

export default function ProductForm({
  mode = 'create',
  initialData = null,
  categories = [],
  galleryImages = [],
  onSubmit,
  onCancel,
  onAddGalleryImage,
  onAddGalleryImages,
  onDeleteGalleryImage,
  onStockIn,
  onStockOut,
  isSubmitting = false,
  isGalleryBusy = false,
  isGalleryLoading = false,
}) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    stock: '',
    reorderLevel: '',
    categoryId: '',
  });
  const [primaryFile, setPrimaryFile] = useState(null);
  const [primaryPreview, setPrimaryPreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    if (initialData && (isEdit || isView)) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price ?? '',
        costPrice: initialData.costPrice ?? '',
        stock: initialData.stock ?? '',
        reorderLevel: initialData.reorderLevel ?? '',
        categoryId: initialData.categoryId ?? '',
      });
      setPrimaryPreview(initialData.imageUrl || null);
      setPrimaryFile(null);
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        costPrice: '',
        stock: '',
        reorderLevel: '',
        categoryId: categories[0]?.id ?? '',
      });
      setPrimaryPreview(null);
      setPrimaryFile(null);
    }
  }, [initialData, isEdit, isView, categories]);

  const handlePrimaryFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPrimaryFile(file);
    setPrimaryPreview(URL.createObjectURL(file));
  };

  const handleGalleryFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (onAddGalleryImages) {
      onAddGalleryImages(files);
    } else if (onAddGalleryImage) {
      files.forEach((f) => onAddGalleryImage(f));
    }
    event.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (isEdit && !isGalleryBusy && !isGalleryLoading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isEdit || isGalleryBusy || isGalleryLoading) return;
    const droppedFiles = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (droppedFiles.length === 0) return;
    if (onAddGalleryImages) {
      onAddGalleryImages(droppedFiles);
    } else if (onAddGalleryImage) {
      droppedFiles.forEach((f) => onAddGalleryImage(f));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isView) return;
    onSubmit?.({
      ...formData,
      file: primaryFile,
    });
  };

  const title = mode === 'create' ? 'Create Product' : isEdit ? 'Edit Product' : 'View Product';

  const inputClass = (disabled) =>
    `w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
      disabled
        ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed'
        : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white'
    }`;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-[#FAFBFD] sticky top-0 z-10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-0.5">
            PRODUCT MANAGEMENT
          </span>
          <h3 className="text-lg font-black uppercase tracking-tight text-neutral-900">{title}</h3>
          <p className="text-xs font-bold text-neutral-400 mt-0.5">
            Manage catalog data, pricing, stock thresholds, and images.
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

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-2">
              Primary Image
            </label>
            <div className="aspect-square rounded-2xl border border-neutral-200 bg-neutral-100 overflow-hidden flex items-center justify-center">
              {primaryPreview ? (
                <img src={primaryPreview} alt={formData.name || 'Product'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-black text-neutral-400">NO IMAGE</span>
              )}
            </div>
            {!isView && (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePrimaryFile} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 h-9 w-full rounded-xl border border-neutral-200 bg-white text-[10px] font-black uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  Upload Primary
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
                Name {isView ? '' : '*'}
              </label>
              <input required={!isView} disabled={isView} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className={inputClass(isView)} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">Category</label>
              <select disabled={isView} required={!isView} value={formData.categoryId} onChange={(event) => setFormData({ ...formData, categoryId: event.target.value })} className={inputClass(isView)}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">Price</label>
              <input type="number" min="0" step="0.01" required={!isView} disabled={isView} value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} className={inputClass(isView)} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">Cost Price</label>
              <input type="number" min="0" step="0.01" disabled={isView} value={formData.costPrice} onChange={(event) => setFormData({ ...formData, costPrice: event.target.value })} className={inputClass(isView)} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700">Stock</label>
                {(isEdit || isView) && (
                  <div className="flex gap-1.5">
                    <button type="button" onClick={onStockIn} className="h-7 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[9px] font-black uppercase text-emerald-700 hover:bg-emerald-100 cursor-pointer">Stock In</button>
                    <button type="button" onClick={onStockOut} className="h-7 px-2.5 rounded-lg border border-red-200 bg-red-50 text-[9px] font-black uppercase text-red-700 hover:bg-red-100 cursor-pointer">Stock Out</button>
                  </div>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="1"
                disabled={mode !== 'create'}
                readOnly={mode !== 'create'}
                value={mode === 'create' ? formData.stock : (formData.stock || 0)}
                onChange={(event) => setFormData({ ...formData, stock: event.target.value })}
                className={inputClass(mode !== 'create')}
              />
              <p className="text-[10px] text-neutral-400 font-bold mt-1">
                {mode === 'create'
                  ? 'Set initial inventory level for new product.'
                  : 'Stock is changed only through Stock In / Stock Out.'}
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">Reorder Level</label>
              <input type="number" min="0" step="1" disabled={isView} value={formData.reorderLevel} onChange={(event) => setFormData({ ...formData, reorderLevel: event.target.value })} className={inputClass(isView)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">Description</label>
              <textarea rows={4} disabled={isView} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className={`${inputClass(isView)} resize-none`} />
            </div>
          </div>
        </div>

        {(isEdit || isView) && (
          <div
            className={`border-t border-neutral-100 pt-5 rounded-2xl transition-all ${
              isDragOver ? 'bg-neutral-50 ring-2 ring-neutral-900 ring-offset-2 p-3' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                  Gallery Images {galleryImages.length > 0 && <span className="text-neutral-400 font-bold">({galleryImages.length})</span>}
                </h4>
                {isEdit && (
                  <p className="text-[10px] text-neutral-400 font-bold">
                    Select or drag & drop multiple images at once
                  </p>
                )}
              </div>
              {isEdit && (
                <>
                  <input
                    ref={galleryRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryFiles}
                  />
                  <button
                    type="button"
                    disabled={isGalleryBusy || isGalleryLoading}
                    onClick={() => galleryRef.current?.click()}
                    className="h-8 px-3.5 rounded-xl border border-neutral-200 bg-white text-[10px] font-black uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {isGalleryBusy ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-neutral-400 border-t-neutral-800 rounded-full animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Images</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {isGalleryLoading ? (
                // Skeleton loading while fetching images
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`gallery-skeleton-${idx}`}
                    className="aspect-square rounded-xl border border-neutral-200 bg-neutral-100/90 animate-pulse flex items-center justify-center"
                  >
                    <div className="w-6 h-6 rounded-md bg-neutral-200" />
                  </div>
                ))
              ) : (
                <>
                  {galleryImages.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square rounded-xl border border-neutral-200 bg-neutral-100 overflow-hidden shadow-xs hover:border-neutral-300 transition-all"
                    >
                      <img src={image.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      {isEdit && (
                        <button
                          type="button"
                          disabled={isGalleryBusy}
                          onClick={() => onDeleteGalleryImage?.(image)}
                          className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-white/95 border border-neutral-200 text-neutral-900 font-black hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 cursor-pointer shadow-xs transition-colors flex items-center justify-center text-sm"
                          title="Delete image"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Uploading skeleton indicator */}
                  {isGalleryBusy && (
                    <div className="aspect-square rounded-xl border border-dashed border-neutral-300 bg-neutral-50 flex flex-col items-center justify-center p-2 text-center animate-pulse">
                      <div className="w-5 h-5 border-2 border-neutral-400 border-t-neutral-900 rounded-full animate-spin mb-1.5" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Uploading...</span>
                    </div>
                  )}

                  {galleryImages.length === 0 && !isGalleryBusy && (
                    <div
                      onClick={() => isEdit && galleryRef.current?.click()}
                      className={`col-span-full rounded-xl border border-dashed ${
                        isDragOver ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-200 bg-neutral-50/50'
                      } p-6 text-center ${isEdit ? 'cursor-pointer hover:border-neutral-300' : ''} transition-colors`}
                    >
                      <p className="text-xs font-bold text-neutral-500">
                        {isEdit ? 'Drop multiple images here or click to browse' : 'No gallery images'}
                      </p>
                      {isEdit && (
                        <p className="text-[10px] text-neutral-400 font-bold mt-1">
                          Upload multiple images at once (PNG, JPG, WEBP)
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
          <button type="button" onClick={onCancel} disabled={isSubmitting} className="h-10 px-4 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold uppercase hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50">
            {isView ? 'Close' : 'Cancel'}
          </button>
          {!isView && (
            <button type="submit" disabled={isSubmitting} className="h-10 px-6 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
