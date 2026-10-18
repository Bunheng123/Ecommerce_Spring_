/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { fetchWishlist, addToWishlist as apiAddToWishlist, removeFromWishlist as apiRemoveFromWishlist } from '../api/wishlist';
import { Toast, ConfirmDialog } from '../admin/utils/swalConfig';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user, token } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sync wishlist from backend whenever user logs in or changes
  const loadWishlist = useCallback(async () => {
    if (!token || !user) {
      setWishlistItems([]);
      return;
    }
    try {
      setLoading(true);
      const items = await fetchWishlist();
      setWishlistItems(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn('Failed to fetch wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  // Set of product IDs currently in the wishlist for quick lookup
  const wishlistIds = useMemo(() => {
    return new Set(wishlistItems.map((item) => Number(item.id)));
  }, [wishlistItems]);

  const isInWishlist = useCallback(
    (productId) => {
      if (!productId) return false;
      return wishlistIds.has(Number(productId));
    },
    [wishlistIds]
  );

  const toggleWishlist = useCallback(
    async (product, navigate) => {
      if (!product || !product.id) return;
      const prodId = Number(product.id);

      // Prompt guest to log in
      if (!user) {
        const result = await ConfirmDialog.fire({
          title: 'Sign In Required',
          text: 'Please log in to save items to your wishlist.',
          confirmButtonText: 'Log In',
          cancelButtonText: 'Cancel',
          showCancelButton: true,
        });
        if (result.isConfirmed && navigate) {
          navigate('/login');
        }
        return;
      }

      const alreadyIn = wishlistIds.has(prodId);

      if (alreadyIn) {
        // Optimistic remove
        setWishlistItems((prev) => prev.filter((item) => Number(item.id) !== prodId));
        Toast.fire({
          icon: 'success',
          title: 'Removed from wishlist',
        });
        try {
          await apiRemoveFromWishlist(prodId);
        } catch (err) {
          // Revert on error
          setWishlistItems((prev) => [...prev, product]);
          Toast.fire({
            icon: 'error',
            title: err.response?.data?.message || err.message || 'Failed to remove from wishlist',
          });
        }
      } else {
        // Optimistic add
        setWishlistItems((prev) => [product, ...prev]);
        Toast.fire({
          icon: 'success',
          title: 'Added to wishlist',
        });
        try {
          const savedProduct = await apiAddToWishlist(prodId);
          if (savedProduct && savedProduct.id) {
            setWishlistItems((prev) =>
              prev.map((item) => (Number(item.id) === prodId ? savedProduct : item))
            );
          }
        } catch (err) {
          // Revert on error
          setWishlistItems((prev) => prev.filter((item) => Number(item.id) !== prodId));
          Toast.fire({
            icon: 'error',
            title: err.response?.data?.message || err.message || 'Failed to add to wishlist',
          });
        }
      }
    },
    [user, wishlistIds]
  );

  const removeFromWishlist = useCallback(async (productId) => {
    if (!productId) return;
    const prodId = Number(productId);
    setWishlistItems((prev) => prev.filter((item) => Number(item.id) !== prodId));
    Toast.fire({
      icon: 'success',
      title: 'Removed from wishlist',
    });
    try {
      await apiRemoveFromWishlist(prodId);
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
    }
  }, []);

  const value = {
    wishlistItems,
    wishlistCount: wishlistItems.length,
    loading,
    isInWishlist,
    toggleWishlist,
    removeFromWishlist,
    refreshWishlist: loadWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
