import apiClient from './apiClient';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

/**
 * Fetch all purchase orders
 * @returns {Promise<Array>}
 */
export async function getAllPurchaseOrders() {
  const response = await apiClient.get('/purchase-orders');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single purchase order by ID
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function getPurchaseOrderById(id) {
  const response = await apiClient.get(`/purchase-orders/${id}`);
  return unwrap(response);
}

/**
 * Create a new purchase order
 * @param {{ supplierId: number, items: Array<{ productId: number, quantity: number, costPrice: number }> }} data
 * @returns {Promise<Object>}
 */
export async function createPurchaseOrder(data) {
  const response = await apiClient.post('/purchase-orders', data);
  return unwrap(response);
}

/**
 * Receive a purchase order (increases stock & logs stock movements)
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function receivePurchaseOrder(id) {
  const response = await apiClient.put(`/purchase-orders/${id}/receive`);
  return unwrap(response);
}

/**
 * Cancel a purchase order
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function cancelPurchaseOrder(id) {
  const response = await apiClient.put(`/purchase-orders/${id}/cancel`);
  return unwrap(response);
}
