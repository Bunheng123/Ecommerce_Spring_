import apiClient from './apiClient';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

/**
 * Fetch all wholesale buyers
 * @returns {Promise<Array>}
 */
export async function getAllWholesaleBuyers() {
  const response = await apiClient.get('/wholesale-buyers');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single wholesale buyer by ID
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function getWholesaleBuyerById(id) {
  const response = await apiClient.get(`/wholesale-buyers/${id}`);
  return unwrap(response);
}

/**
 * Create a new wholesale buyer
 * @param {{ type: 'INDIVIDUAL' | 'ORGANIZATION', name: string, contactPerson?: string, phone?: string, email?: string, address?: string, active?: boolean }} data
 * @returns {Promise<Object>}
 */
export async function createWholesaleBuyer(data) {
  const response = await apiClient.post('/wholesale-buyers', data);
  return unwrap(response);
}

/**
 * Update an existing wholesale buyer
 * @param {number|string} id
 * @param {{ type: 'INDIVIDUAL' | 'ORGANIZATION', name: string, contactPerson?: string, phone?: string, email?: string, address?: string, active?: boolean }} data
 * @returns {Promise<Object>}
 */
export async function updateWholesaleBuyer(id, data) {
  const response = await apiClient.put(`/wholesale-buyers/${id}`, data);
  return unwrap(response);
}

/**
 * Delete or deactivate a wholesale buyer
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export async function deleteWholesaleBuyer(id) {
  const response = await apiClient.delete(`/wholesale-buyers/${id}`);
  return unwrap(response);
}
