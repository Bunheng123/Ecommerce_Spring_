import apiClient from './apiClient';

/**
 * Get current user's cart from backend
 * GET /api/cart
 */
export async function getCart() {
  const response = await apiClient.get('/cart');
  return response.data?.data ?? response.data;
}

/**
 * Add an item to the current user's cart
 * POST /api/cart/items
 * @param {number|string} productId 
 * @param {number} quantity 
 */
export async function addItem(productId, quantity = 1) {
  const response = await apiClient.post('/cart/items', {
    productId: Number(productId),
    quantity: Number(quantity),
  });
  return response.data?.data ?? response.data;
}

/**
 * Update quantity of a cart item
 * PUT /api/cart/items/{itemId}
 * @param {number|string} itemId 
 * @param {number} quantity 
 */
export async function updateItem(itemId, quantity) {
  const response = await apiClient.put(`/cart/items/${itemId}`, {
    quantity: Number(quantity),
  });
  return response.data?.data ?? response.data;
}

/**
 * Remove an item from the cart
 * DELETE /api/cart/items/{itemId}
 * @param {number|string} itemId 
 */
export async function removeItem(itemId) {
  const response = await apiClient.delete(`/cart/items/${itemId}`);
  return response.data?.data ?? response.data;
}

/**
 * Clear all items from the cart
 * DELETE /api/cart
 */
export async function clearCart() {
  const response = await apiClient.delete('/cart');
  return response.data?.data ?? response.data;
}

/**
 * Checkout the cart
 * POST /api/cart/checkout
 * @param {string | { shippingAddress: string, paymentMethod?: string, customerNote?: string }} options
 */
export async function checkoutCart(options) {
  const payload = typeof options === 'string'
    ? {
        shippingAddress: options,
        paymentMethod: 'BANK_TRANSFER',
        customerNote: '',
      }
    : {
        shippingAddress: options.shippingAddress,
        paymentMethod: options.paymentMethod || 'BANK_TRANSFER',
        customerNote: options.customerNote || '',
      };

  const response = await apiClient.post('/cart/checkout', payload);
  return response.data?.data ?? response.data;
}

// Backward compatibility aliases
export const fetchCart = getCart;
export const addToCart = addItem;
export const updateCartItem = updateItem;
export const removeCartItem = removeItem;
