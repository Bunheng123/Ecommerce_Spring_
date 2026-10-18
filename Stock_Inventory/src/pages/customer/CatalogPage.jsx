import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard, { ProductCardSkeleton } from '../../components/customer/ProductCard';
import { fetchCategories, fetchBrands, fetchCatalogProducts } from '../../api/products';

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination state (0-indexed for backend Spring Data)
  const [page, setPage] = useState(0);
  const pageSize = 12;

  // Data states
  const [products, setProducts] = useState([]);
  const [pageData, setPageData] = useState({
    totalElements: 0,
    totalPages: 1,
    number: 0,
    size: pageSize,
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load distinct categories and brands once on mount
  useEffect(() => {
    Promise.allSettled([fetchCategories(), fetchBrands()]).then(([cats, brs]) => {
      if (cats.status === 'fulfilled' && Array.isArray(cats.value)) {
        setCategories(cats.value);
      }
      if (brs.status === 'fulfilled' && Array.isArray(brs.value)) {
        setBrands(brs.value);
      }
    });
  }, []);

  // Sync from URL query params (e.g. ?q=... or ?category=...)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q != null) {
      setSearchQuery((prev) => (prev !== q ? q : prev));
      setDebouncedSearch(q.trim());
    }
    const cat = searchParams.get('category');
    if (cat != null) {
      setSelectedCategory((prev) => (prev !== cat ? cat : prev));
    }
  }, [searchParams]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page to 0 (Page 1) whenever any filter or search changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, selectedCategory, selectedBrand, appliedMinPrice, appliedMaxPrice, sortBy]);

  // Fetch paginated products from server
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const params = {
      page,
      size: pageSize,
      sort: sortBy,
    };

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    if (selectedCategory && selectedCategory !== 'ALL') {
      params.categoryId = selectedCategory;
    }
    if (selectedBrand && selectedBrand !== 'ALL') {
      if (!isNaN(Number(selectedBrand))) {
        params.brandId = Number(selectedBrand);
      } else {
        params.brand = selectedBrand;
      }
    }
    if (appliedMinPrice !== '' && !isNaN(Number(appliedMinPrice))) {
      params.minPrice = Number(appliedMinPrice);
    }
    if (appliedMaxPrice !== '' && !isNaN(Number(appliedMaxPrice))) {
      params.maxPrice = Number(appliedMaxPrice);
    }

    fetchCatalogProducts(params)
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.content) ? [...res.content] : [];
        if (sortBy === 'newest') {
          list.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              if (diff !== 0) return diff;
            }
            return Number(b.id || 0) - Number(a.id || 0);
          });
        }
        setProducts(list);
        setPageData({
          totalElements: res.totalElements ?? 0,
          totalPages: Math.max(1, res.totalPages ?? 1),
          number: res.number ?? 0,
          size: res.size ?? pageSize,
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load catalog products:', err);
        setProducts([]);
        setPageData({
          totalElements: 0,
          totalPages: 1,
          number: 0,
          size: pageSize,
        });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page, debouncedSearch, selectedCategory, selectedBrand, appliedMinPrice, appliedMaxPrice, sortBy]);

  const handleApplyPrice = (e) => {
    e.preventDefault();
    setAppliedMinPrice(minPriceInput.trim());
    setAppliedMaxPrice(maxPriceInput.trim());
  };

  const handleClearPrice = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
  };

  const handleResetAll = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('ALL');
    setSelectedBrand('ALL');
    handleClearPrice();
    setSortBy('newest');
    setPage(0);
    setSearchParams({});
  };

  const isPriceFiltered = appliedMinPrice !== '' || appliedMaxPrice !== '';
  const hasActiveFilters =
    debouncedSearch ||
    selectedCategory !== 'ALL' ||
    selectedBrand !== 'ALL' ||
    isPriceFiltered ||
    sortBy !== 'newest';

  const startItem = pageData.totalElements === 0 ? 0 : pageData.number * pageData.size + 1;
  const endItem = Math.min(pageData.totalElements, (pageData.number + 1) * pageData.size);

  // Generate page numbers array with ellipses if needed
  const renderPageNumbers = () => {
    const total = pageData.totalPages;
    const current = pageData.number;
    const pages = [];

    if (total <= 7) {
      for (let i = 0; i < total; i++) pages.push(i);
    } else {
      pages.push(0);
      if (current > 2) pages.push('ellipsis-start');
      const start = Math.max(1, current - 1);
      const end = Math.min(total - 2, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 3) pages.push('ellipsis-end');
      pages.push(total - 1);
    }

    return pages.map((p, idx) => {
      if (typeof p === 'string') {
        return (
          <span key={`el-${idx}`} className="px-2 py-1 text-xs font-mono text-muted">
            ...
          </span>
        );
      }
      const isActive = p === current;
      return (
        <button
          key={p}
          type="button"
          onClick={() => {
            setPage(p);
            window.scrollTo({ top: 180, behavior: 'smooth' });
          }}
          className={`h-9 min-w-9 px-3 text-xs font-bold font-mono transition-colors border cursor-pointer ${
            isActive
              ? 'border-ink bg-ink text-white'
              : 'border-line bg-white text-ink hover:bg-neutral-100 hover:border-ink'
          }`}
        >
          {p + 1}
        </button>
      );
    });
  };

  return (
    <div className="bg-surface min-h-screen py-10">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        {/* Header */}
        <div className="border-b border-line pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted block mb-1">
              STOREFRONT INVENTORY
            </span>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl">
              Product Catalog
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-bold text-muted">
              {loading
                ? 'Loading catalog...'
                : pageData.totalElements === 0
                ? '0 Products'
                : `Showing ${startItem}–${endItem} of ${pageData.totalElements} Products`}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-[11px] font-black uppercase tracking-wider text-neutral-600 hover:text-ink underline cursor-pointer"
              >
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Strip */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'border-ink bg-ink text-white shadow-xs'
                : 'border-line bg-white text-muted hover:text-ink hover:border-ink'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isSelected = String(selectedCategory) === String(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : String(cat.id))}
                className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
                  isSelected
                    ? 'border-ink bg-ink text-white shadow-xs'
                    : 'border-line bg-white text-muted hover:text-ink hover:border-ink'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Secondary Filters Bar: Search, Brand, Price Range, Sort */}
        <div className="bg-white border border-line p-4 md:p-5 shadow-surface mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            {/* 1. Debounced Search Input */}
            <div className="relative">
              <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name, brand, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 border border-line bg-[#FAFAFA] px-3.5 text-xs font-bold text-ink placeholder:text-subtle focus:bg-white focus:border-ink focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearch('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-ink text-sm font-bold cursor-pointer"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* 2. Brand Dropdown */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1">
                Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full h-10 border border-line bg-[#FAFAFA] px-3 text-xs font-bold text-ink focus:bg-white focus:border-ink focus:outline-none transition-colors cursor-pointer"
              >
                <option value="ALL">All Brands ({brands.length})</option>
                {brands.map((b) => {
                  const val = b.id != null ? String(b.id) : b;
                  const label = b.name != null ? b.name : b;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 3. Price Range Filter */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1">
                Price Range ($)
              </label>
              <form onSubmit={handleApplyPrice} className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Min"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="w-full h-10 border border-line bg-[#FAFAFA] px-2 text-xs font-bold text-ink focus:bg-white focus:border-ink focus:outline-none"
                />
                <span className="text-muted font-bold text-xs">–</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Max"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="w-full h-10 border border-line bg-[#FAFAFA] px-2 text-xs font-bold text-ink focus:bg-white focus:border-ink focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-10 px-3 bg-ink text-white text-[11px] font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                >
                  Apply
                </button>
                {isPriceFiltered && (
                  <button
                    type="button"
                    onClick={handleClearPrice}
                    className="h-10 px-2.5 border border-line bg-white text-neutral-600 hover:text-ink text-[11px] font-bold uppercase transition-colors cursor-pointer shrink-0"
                    title="Clear price filter"
                  >
                    ×
                  </button>
                )}
              </form>
            </div>

            {/* 4. Sort Dropdown */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-10 border border-line bg-[#FAFAFA] px-3 text-xs font-bold text-ink focus:bg-white focus:border-ink focus:outline-none transition-colors cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A–Z</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-line/60 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                Active Filters:
              </span>
              {debouncedSearch && (
                <span className="inline-flex items-center gap-1.5 border border-line bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-bold uppercase text-ink">
                  Search: &ldquo;{debouncedSearch}&rdquo;
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearch('');
                    }}
                    className="font-black hover:text-red-600 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedCategory !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 border border-line bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-bold uppercase text-ink">
                  Category: {categories.find((c) => String(c.id) === String(selectedCategory))?.name || selectedCategory}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className="font-black hover:text-red-600 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedBrand !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 border border-line bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-bold uppercase text-ink">
                  Brand: {brands.find((b) => String(b.id) === String(selectedBrand) || b.name === selectedBrand)?.name || selectedBrand}
                  <button
                    type="button"
                    onClick={() => setSelectedBrand('ALL')}
                    className="font-black hover:text-red-600 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {isPriceFiltered && (
                <span className="inline-flex items-center gap-1.5 border border-line bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-bold uppercase text-ink">
                  Price: {appliedMinPrice ? `$${appliedMinPrice}` : '$0'} – {appliedMaxPrice ? `$${appliedMaxPrice}` : 'Any'}
                  <button
                    type="button"
                    onClick={handleClearPrice}
                    className="font-black hover:text-red-600 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {sortBy !== 'newest' && (
                <span className="inline-flex items-center gap-1.5 border border-line bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-bold uppercase text-ink">
                  Sort: {sortBy}
                  <button
                    type="button"
                    onClick={() => setSortBy('newest')}
                    className="font-black hover:text-red-600 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Grid of Product Cards or Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProductCardSkeleton key={`catalog-skeleton-${idx}`} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((item) => (
              <ProductCard key={item.id} product={item} variant="grid" />
            ))}
          </div>
        ) : (
          <div className="border border-line bg-white p-12 text-center shadow-surface">
            <h3 className="text-base font-extrabold uppercase tracking-tight text-ink">
              No artifacts match your query
            </h3>
            <p className="text-xs font-bold text-muted mt-1 max-w-md mx-auto">
              Try adjusting your search terms, changing the brand, or broadening the price range.
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="mt-5 border border-ink bg-ink text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-neutral-800 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Clean Pagination Controls */}
        {!loading && products.length > 0 && pageData.totalPages > 1 && (
          <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Showing {startItem}–{endItem} of {pageData.totalElements} Products
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageData.number <= 0}
                onClick={() => {
                  setPage((p) => Math.max(0, p - 1));
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className="h-9 px-4 border border-line bg-white text-xs font-black uppercase tracking-wider text-ink hover:bg-neutral-100 hover:border-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">{renderPageNumbers()}</div>

              <button
                type="button"
                disabled={pageData.number >= pageData.totalPages - 1}
                onClick={() => {
                  setPage((p) => Math.min(pageData.totalPages - 1, p + 1));
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className="h-9 px-4 border border-line bg-white text-xs font-black uppercase tracking-wider text-ink hover:bg-neutral-100 hover:border-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
