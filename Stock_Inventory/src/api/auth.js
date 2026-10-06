import apiClient from './apiClient';

/**
 * Register a new user
 * @param {{ username: string, email: string, password: string }} data
 * @returns {Promise<any>}
 */
export async function register(data) {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
}

/**
 * Login user and receive JWT token
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ username: string, token: string, roles: string[] }>}
 */
export async function login(credentials) {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
}

/**
 * Get current authenticated user's profile details
 * @returns {Promise<any>} User profile object
 */
export async function getCurrentUser() {
  const response = await apiClient.get('/users/me');
  return response.data?.data ?? response.data;
}

/**
 * Update current authenticated user's profile details (fullName, phone)
 * @param {{ fullName?: string, phone?: string }} data
 * @returns {Promise<any>} Updated user profile
 */
export async function updateProfile(data) {
  const response = await apiClient.put('/users/me', data);
  return response.data?.data ?? response.data;
}

/**
 * Upload profile picture (multipart/form-data with "file" param)
 * @param {File | FormData} fileOrFormData
 * @returns {Promise<any>} Updated user profile
 */
export async function uploadProfilePicture(fileOrFormData) {
  let formData;
  if (fileOrFormData instanceof FormData) {
    formData = fileOrFormData;
  } else {
    formData = new FormData();
    formData.append('file', fileOrFormData);
  }

  const response = await apiClient.post('/users/me/profile-picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data?.data ?? response.data;
}
