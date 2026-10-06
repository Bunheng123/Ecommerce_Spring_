import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard, { ProductCardSkeleton } from '../../components/customer/ProductCard';
import { fetchProducts, fetchCategories } from '../../api/products';

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchProducts(), fetchCategories()])
      .then(([productsRes, categoriesRes]) => {
        if (productsRes.status === 'fulfilled' && Array.isArray(productsRes.value)) {
          setProducts(productsRes.value);
        }
        if (categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value)) {
          setDbCategories(categoriesRes.value.map((c) => c.name).filter(Boolean));
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Sync with URL query parameter if present
  useEffect(() => {
    const q = searchParams.get('q');
    if (q != null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Extract unique categories (backend categories + product categories)
  const categories = [
    'ALL',
    ...Array.from(
      new Set([
        ...dbCategories,
        ...products.map((p) => p.categoryName || 'GENERAL').filter(Boolean),
      ])
    ),
  ];

  const filtered = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      (p.categoryName || '').toUpperCase() === selectedCategory.toUpperCase();
    const matchesSearch =
      !searchQuery.trim() ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-surface min-h-screen py-10">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        {/* Header */}
        <div className="border-b border-line pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Complete Inventory Catalog
            </span>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl">
              All Artifacts
            </h1>
          </div>
          <div className="text-xs uppercase font-bold text-muted">
            {loading ? 'Loading catalog...' : `Showing ${filtered.length} of ${products.length} Items`}
          </div>
        </div>

        {/* Filter bar & Category Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border ${
                  selectedCategory === cat
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-white text-muted hover:text-ink hover:border-ink'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="SEARCH CATALOG..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-line bg-white px-3 py-2 text-xs uppercase font-bold placeholder:text-subtle focus:border-ink focus:outline-none"
            />
          </div>
        </div>

        {/* Grid of Product Cards or Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProductCardSkeleton key={`catalog-skeleton-${idx}`} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((item) => (
              <ProductCard key={item.id} product={item} variant="grid" />
            ))}
          </div>
        ) : (
          <div className="border border-line bg-white p-12 text-center shadow-surface">
            <p className="text-sm font-bold uppercase tracking-wider text-muted">
              No artifacts match your query.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="mt-4 border border-ink bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink hover:bg-neutral-100"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
