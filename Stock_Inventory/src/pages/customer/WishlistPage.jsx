import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import ProductCard, { ProductCardSkeleton } from '../../components/customer/ProductCard';

export default function WishlistPage() {
  const { wishlistItems, wishlistCount, loading, refreshWishlist } = useWishlist();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (user) {
      refreshWishlist();
    }
  }, [user, refreshWishlist]);

  return (
    <div className="min-h-[calc(100vh-160px)] bg-background py-10">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-muted">
          <Link to="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-ink">Wishlist</span>
        </nav>

        {/* Header Banner */}
        <div className="mb-8 border border-line bg-white p-6 md:p-8 shadow-surface">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-ink">
                  My Wishlist
                </h1>
                {user && (
                  <span className="border border-ink bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink">
                    {wishlistCount} {wishlistCount === 1 ? 'Item' : 'Items'}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted font-medium">
                Saved items to purchase or review at your convenience.
              </p>
            </div>

            <Link
              to="/shop"
              className="inline-flex items-center justify-center self-start md:self-auto h-10 px-5 border border-line bg-white hover:bg-neutral-50 hover:border-ink text-xs font-bold uppercase tracking-wider text-ink transition-colors cursor-pointer"
            >
              Continue Shopping &rarr;
            </Link>
          </div>
        </div>

        {/* Unauthenticated State */}
        {!user ? (
          <div className="border border-line bg-white p-12 text-center shadow-surface">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-chip text-ink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-wide text-ink">
              Sign In to View Your Wishlist
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-muted leading-relaxed">
              Create an account or log in to sync your saved items across all your devices.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center px-6 bg-ink text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="inline-flex h-10 items-center justify-center px-6 border border-line bg-white hover:bg-neutral-50 text-ink text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : loading && wishlistItems.length === 0 ? (
          /* Loading State */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))}
          </div>
        ) : wishlistItems.length === 0 ? (
          /* Empty State */
          <div className="border border-line bg-white p-12 md:p-16 text-center shadow-surface">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-line bg-chip text-muted">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-tight text-ink">
              Your Wishlist Is Empty
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-muted leading-relaxed">
              Explore our collection and click the heart icon on any product to save your favorite items for later.
            </p>
            <div className="mt-6">
              <Link
                to="/shop"
                className="inline-flex h-11 items-center justify-center px-8 border border-ink bg-ink text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-[0.1em] transition-colors shadow-sm"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        ) : (
          /* Wishlist Items Grid */
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {wishlistItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
