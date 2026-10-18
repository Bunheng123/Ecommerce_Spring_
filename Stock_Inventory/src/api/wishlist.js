import apiClient from './apiClient';

/**
 * Get current logged-in user's wishlist
 * GET /api/wishlist
 * @returns {Promise<Array>} List of ProductResponseDto
 */
export async function fetchWishlist() {
  const response = await apiClient.get('/wishlist');
  return response.data?.data ?? [];
}

/**
 * Add a product to the user's wishlist (idempotent)
 * POST /api/wishlist/{productId}
 * @param {number|string} productId
 * @returns {Promise<Object>} Added ProductResponseDto
 */
export async function addToWishlist(productId) {
  const response = await apiClient.post(`/wishlist/${productId}`);
  return response.data?.data ?? response.data;
}

/**
 * Remove a product from the user's wishlist
 * DELETE /api/wishlist/{productId}
 * @param {number|string} productId
 * @returns {Promise<Object>}
 */
export async function removeFromWishlist(productId) {
  const response = await apiClient.delete(`/wishlist/${productId}`);
  return response.data?.data ?? response.data;
}
