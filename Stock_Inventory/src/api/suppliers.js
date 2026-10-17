import apiClient from './apiClient';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

/**
 * Fetch all suppliers
 * @returns {Promise<Array>}
 */
export async function getAllSuppliers() {
  const response = await apiClient.get('/suppliers');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single supplier by ID
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function getSupplierById(id) {
  const response = await apiClient.get(`/suppliers/${id}`);
  return unwrap(response);
}

/**
 * Create a new supplier
 * @param {{ name: string, contactPerson?: string, phone?: string, email?: string, address?: string, active?: boolean }} data
 * @returns {Promise<Object>}
 */
export async function createSupplier(data) {
  const response = await apiClient.post('/suppliers', data);
  return unwrap(response);
}

/**
 * Update an existing supplier
 * @param {number|string} id
 * @param {{ name: string, contactPerson?: string, phone?: string, email?: string, address?: string, active?: boolean }} data
 * @returns {Promise<Object>}
 */
export async function updateSupplier(id, data) {
  const response = await apiClient.put(`/suppliers/${id}`, data);
  return unwrap(response);
}

/**
 * Delete or deactivate a supplier
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export async function deleteSupplier(id) {
  const response = await apiClient.delete(`/suppliers/${id}`);
  return unwrap(response);
}
