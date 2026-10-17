import apiClient from './apiClient';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

/**
 * Fetch all wholesale orders
 * @returns {Promise<Array>}
 */
export async function getAllWholesaleOrders() {
  const response = await apiClient.get('/wholesale-orders');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single wholesale order by ID
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function getWholesaleOrderById(id) {
  const response = await apiClient.get(`/wholesale-orders/${id}`);
  return unwrap(response);
}

/**
 * Create a new wholesale order
 * @param {{ buyerId: number, items: Array<{ productId: number, quantity: number, wholesalePrice: number }> }} data
 * @returns {Promise<Object>}
 */
export async function createWholesaleOrder(data) {
  const response = await apiClient.post('/wholesale-orders', data);
  return unwrap(response);
}

/**
 * Complete a wholesale order (deducts stock & logs stock movements)
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function completeWholesaleOrder(id) {
  const response = await apiClient.put(`/wholesale-orders/${id}/complete`);
  return unwrap(response);
}

/**
 * Cancel a wholesale order
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function cancelWholesaleOrder(id) {
  const response = await apiClient.put(`/wholesale-orders/${id}/cancel`);
  return unwrap(response);
}
