import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  getCart,
  addItem as addItemApi,
  updateItem as updateItemApi,
  removeItem as removeItemApi,
  clearCart as clearCartApi,
} from '../api/cart';

const CartContext = createContext(null);

const EMPTY_CART = {
  id: null,
  userId: null,
  items: [],
  totalAmount: 0,
};

function hasUserRole(user) {
  const roles = [
    user?.role,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ]
    .filter(Boolean)
    .map((role) => String(role).toUpperCase());

  return roles.some((role) => role === 'USER' || role === 'ROLE_USER');
}

/**
 * Generates a per-user cache key in localStorage, e.g. "cart_cache_user_4".
 * Strictly scoped by user ID to prevent cross-account cart leaks on shared browsers.
 */
export function getCartCacheKey(userId) {
  return userId != null ? `cart_cache_user_${userId}` : null;
}

export function CartProvider({ children }) {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const currentUserId = user?.id ?? user?.username ?? null;
  const canUseCart = Boolean(token && currentUserId != null && hasUserRole(user));

  // Read per-user cache as instant placeholder on mount / user change
  const [cart, setCart] = useState(() => {
    if (token && currentUserId != null) {
      try {
        const cached = localStorage.getItem(getCartCacheKey(currentUserId));
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.items)) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Failed to parse cached cart:', err);
      }
    }
    return EMPTY_CART;
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const isFetchingRef = useRef(false);

  // Sync cart from backend when user or token changes (Login, Logout, Initial session restoration)
  useEffect(() => {
    // 1. If logged out, completely clear CartContext in memory
    if (!canUseCart) {
      setCart(EMPTY_CART);
      return;
    }

    // 2. If logged in, read this specific user's cache immediately as a placeholder
    const cacheKey = getCartCacheKey(currentUserId);
    if (cacheKey) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.items)) {
            setCart(parsed);
          }
        }
      } catch (e) {
        console.warn('Error reading cart cache:', e);
      }
    }

    // 3. Immediately re-fetch from real backend API as single source of truth (backend response wins)
    let isCancelled = false;
    isFetchingRef.current = true;

    getCart()
      .then((backendCart) => {
        if (!isCancelled && backendCart) {
          const safeCart = {
            id: backendCart.id ?? null,
            userId: backendCart.userId ?? currentUserId,
            items: Array.isArray(backendCart.items) ? backendCart.items : [],
            totalAmount: Number(backendCart.totalAmount || 0),
          };
          setCart(safeCart);

          // Update per-user cache
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify(safeCart));
          }
        }
      })
      .catch((err) => {
        console.warn('Cart backend synchronization failed:', err);
      })
      .finally(() => {
        isFetchingRef.current = false;
      });

    return () => {
      isCancelled = true;
    };
  }, [canUseCart, currentUserId]);

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const subtotal = cart?.totalAmount != null
    ? Number(cart.totalAmount)
    : items.reduce((sum, it) => sum + (Number(it.subtotal) || Number(it.price) * Number(it.quantity)), 0);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  /**
   * Add Item to Cart (Calls real backend API first; updates state & per-user cache after success)
   * Logged-out users are redirected to /login
   */
  const addItem = useCallback(
    async (productOrId, quantity = 1) => {
      // Anonymous / Logged-out visitors must be redirected to /login
      if (!canUseCart || !isAuthenticated) {
        navigate('/login');
        return { redirected: true };
      }

      const prodId = typeof productOrId === 'object' ? productOrId.id : productOrId;
      setIsMutating(true);

      try {
        // Backend API call first
        const updatedCart = await addItemApi(prodId, quantity);

        const safeCart = {
          id: updatedCart.id ?? null,
          userId: updatedCart.userId ?? currentUserId,
          items: Array.isArray(updatedCart.items) ? updatedCart.items : [],
          totalAmount: Number(updatedCart.totalAmount || 0),
        };

        // Update state and per-user cache
        setCart(safeCart);
        const cacheKey = getCartCacheKey(currentUserId);
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify(safeCart));
        }

        setIsDrawerOpen(true);
        return { success: true, cart: safeCart };
      } catch (err) {
        console.error('Failed to add item to cart:', err);
        const rawMsg = err.response?.data?.message || err.message || 'Unable to add item to cart';
        const cleanMsg = rawMsg.replace(/^Error\s*:\s*/i, '');
        throw new Error(cleanMsg);
      } finally {
        setIsMutating(false);
      }
    },
    [canUseCart, isAuthenticated, currentUserId, navigate]
  );

  /**
   * Update quantity of an item in the cart
   */
  const updateQuantity = useCallback(
    async (itemId, quantity) => {
      if (!canUseCart) return;
      if (quantity < 1) return;

      setIsMutating(true);
      try {
        const updatedCart = await updateItemApi(itemId, quantity);
        const safeCart = {
          id: updatedCart.id ?? null,
          userId: updatedCart.userId ?? currentUserId,
          items: Array.isArray(updatedCart.items) ? updatedCart.items : [],
          totalAmount: Number(updatedCart.totalAmount || 0),
        };

        setCart(safeCart);
        const cacheKey = getCartCacheKey(currentUserId);
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify(safeCart));
        }
        return { success: true };
      } catch (err) {
        console.error('Failed to update cart item:', err);
        const rawMsg = err.response?.data?.message || err.message || 'Unable to update item';
        throw new Error(rawMsg.replace(/^Error\s*:\s*/i, ''));
      } finally {
        setIsMutating(false);
      }
    },
    [canUseCart, currentUserId]
  );

  /**
   * Remove item from cart
   */
  const removeItem = useCallback(
    async (itemId) => {
      if (!canUseCart) return;

      setIsMutating(true);
      try {
        const updatedCart = await removeItemApi(itemId);
        const safeCart = {
          id: updatedCart.id ?? null,
          userId: updatedCart.userId ?? currentUserId,
          items: Array.isArray(updatedCart.items) ? updatedCart.items : [],
          totalAmount: Number(updatedCart.totalAmount || 0),
        };

        setCart(safeCart);
        const cacheKey = getCartCacheKey(currentUserId);
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify(safeCart));
        }
        return { success: true };
      } catch (err) {
        console.error('Failed to remove cart item:', err);
        const rawMsg = err.response?.data?.message || err.message || 'Unable to remove item';
        throw new Error(rawMsg.replace(/^Error\s*:\s*/i, ''));
      } finally {
        setIsMutating(false);
      }
    },
    [canUseCart, currentUserId]
  );

  /**
   * Clear all items in cart
   */
  const clearCart = useCallback(async () => {
    if (!canUseCart) return;

    setIsMutating(true);
    try {
      await clearCartApi();
      const emptyCart = {
        id: cart?.id ?? null,
        userId: currentUserId,
        items: [],
        totalAmount: 0,
      };

      setCart(emptyCart);
      const cacheKey = getCartCacheKey(currentUserId);
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify(emptyCart));
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to clear cart:', err);
      const rawMsg = err.response?.data?.message || err.message || 'Unable to clear cart';
      throw new Error(rawMsg.replace(/^Error\s*:\s*/i, ''));
    } finally {
      setIsMutating(false);
    }
  }, [canUseCart, currentUserId, cart]);

  const value = {
    cart,
    items,
    itemCount,
    subtotal,
    isDrawerOpen,
    isMutating,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    addItem,
    updateQuantity,
    updateItem: updateQuantity,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
