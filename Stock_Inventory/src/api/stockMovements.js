import apiClient from './apiClient';

export async function fetchStockMovements() {
  const response = await apiClient.get('/stock-movements');
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : (data?.content ?? []);
}

export async function stockIn(productId, payload) {
  const response = await apiClient.post(`/products/${productId}/stock-in`, payload);
  return response.data?.data ?? response.data;
}

export async function stockOut(productId, payload) {
  const response = await apiClient.post(`/products/${productId}/stock-out`, payload);
  return response.data?.data ?? response.data;
}

export function getApiErrorMessage(error, fallback = 'Request failed') {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}
