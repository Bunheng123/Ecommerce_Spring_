import apiClient from './apiClient';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

export async function fetchBrands() {
  try {
    const response = await apiClient.get('/brands');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.response?.status === 404) return [];
    throw error;
  }
}

export async function fetchBrandById(id) {
  const response = await apiClient.get(`/brands/${id}`);
  return unwrap(response);
}

export async function createBrand(data) {
  const response = await apiClient.post('/brands', {
    name: data.name?.trim(),
    description: data.description?.trim() || '',
  });
  return unwrap(response);
}

export async function updateBrand(id, data) {
  const response = await apiClient.put(`/brands/${id}`, {
    name: data.name?.trim(),
    description: data.description?.trim() || '',
  });
  return unwrap(response);
}

export async function deleteBrand(id) {
  const response = await apiClient.delete(`/brands/${id}`);
  return unwrap(response);
}
