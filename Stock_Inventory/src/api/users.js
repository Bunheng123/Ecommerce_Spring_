import apiClient from './apiClient';

/**
 * Admin API client for user management (/api/users)
 * Note: Profile management for the current user is handled in auth.js (/api/users/me).
 */

/**
 * Get all users in the system (ADMIN only)
 * GET /api/users
 * @returns {Promise<Array>} List of user objects
 */
export async function getAllUsers() {
  const response = await apiClient.get('/users');
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Get a specific user by ID (ADMIN only)
 * GET /api/users/{id}
 * @param {string|number} id
 * @returns {Promise<Object>} User object
 */
export async function getUserById(id) {
  const response = await apiClient.get(`/users/${id}`);
  return response.data?.data ?? response.data;
}

/**
 * Create a new user account (ADMIN only)
 * Role can be USER, STOCK, or ADMIN
 * POST /api/users
 * @param {{ fullName: string, email: string, password: string, role?: string, username?: string, phone?: string }} data
 * @returns {Promise<Object>} Created user object
 */
export async function createUser(data) {
  const role = String(data.role || 'USER').toUpperCase();

  const payload = {
    fullName: data.fullName?.trim(),
    username: data.username?.trim() || data.fullName?.trim().toLowerCase().replaceAll(/\s+/g, '_') || data.email?.split('@')[0],
    email: data.email?.trim(),
    password: data.password,
    role: role,
  };
  if (data.phone !== undefined && data.phone !== null) {
    payload.phone = data.phone.trim();
  }

  const response = await apiClient.post('/users', payload);
  return response.data?.data ?? response.data;
}

/**
 * Update an existing user's details and role (ADMIN only)
 * PUT /api/users/{id}
 * @param {string|number} id
 * @param {{ fullName?: string, email?: string, role?: string, username?: string, password?: string, phone?: string }} data
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUser(id, data) {
  const payload = {};
  if (data.fullName !== undefined) payload.fullName = data.fullName.trim();
  if (data.username !== undefined && data.username.trim() !== '') payload.username = data.username.trim();
  if (data.email !== undefined) payload.email = data.email.trim();
  if (data.role !== undefined) payload.role = String(data.role).trim().toUpperCase();
  if (data.phone !== undefined) payload.phone = data.phone ? data.phone.trim() : '';
  if (data.password && data.password.trim() !== '') payload.password = data.password.trim();

  const response = await apiClient.put(`/users/${id}`, payload);
  return response.data?.data ?? response.data;
}

/**
 * Upload profile picture for a specific user (ADMIN only)
 * POST /api/users/{id}/profile-picture
 * @param {string|number} id
 * @param {File | FormData} fileOrFormData
 * @returns {Promise<Object>} Updated user object
 */
export async function uploadUserProfilePicture(id, fileOrFormData) {
  let formData;
  if (fileOrFormData instanceof FormData) {
    formData = fileOrFormData;
  } else {
    formData = new FormData();
    formData.append('file', fileOrFormData);
  }

  const response = await apiClient.post(`/users/${id}/profile-picture`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data?.data ?? response.data;
}

/**
 * Delete a user account (ADMIN only)
 * Backend enforces that an admin cannot delete their own account.
 * DELETE /api/users/{id}
 * @param {string|number} id
 * @returns {Promise<any>}
 */
export async function deleteUser(id) {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data?.data ?? response.data;
}
