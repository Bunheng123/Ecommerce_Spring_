import apiClient from './apiClient';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

function toProductFormData(data) {
  const formData = new FormData();
  formData.append('name', data.name?.trim() || '');
  formData.append('description', data.description?.trim() || '');
  formData.append('price', String(Number(data.price || 0)));
  formData.append('stock', String(Number(data.stock || 0)));
  formData.append('costPrice', String(Number(data.costPrice || 0)));
  formData.append('reorderLevel', String(Number(data.reorderLevel || 0)));
  formData.append('categoryId', String(data.categoryId || ''));
  if (data.file) {
    formData.append('file', data.file);
  }
  return formData;
}

export async function fetchProducts() {
  const response = await apiClient.get('/products');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminProducts() {
  const response = await apiClient.get('/products/admin');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function fetchLowStockProducts() {
  const response = await apiClient.get('/products/low-stock');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function fetchProductById(id) {
  const response = await apiClient.get(`/products/${id}`);
  return unwrap(response);
}

export async function createProduct(data) {
  const response = await apiClient.post('/products', toProductFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
}

export async function updateProduct(id, data) {
  const response = await apiClient.put(`/products/${id}`, toProductFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
}

export async function deleteProduct(id) {
  const response = await apiClient.delete(`/products/${id}`);
  return unwrap(response);
}

export async function hardDeleteProduct(id) {
  const response = await apiClient.delete(`/products/${id}/hard`);
  return unwrap(response);
}

export async function activateProduct(id) {
  try {
    const response = await apiClient.patch(`/products/${id}/activate`);
    return unwrap(response);
  } catch (err) {
    if (err?.response?.status === 405) {
      const response = await apiClient.put(`/products/${id}/activate`);
      return unwrap(response);
    }
    throw err;
  }
}

export async function fetchProductImages(productId) {
  const response = await apiClient.get(`/products/${productId}/images`);
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function addProductImage(productId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post(`/products/${productId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
}

export async function deleteProductImage(productId, imageId) {
  const response = await apiClient.delete(`/products/${productId}/images/${imageId}`);
  return unwrap(response);
}

export async function fetchCategories() {
  try {
    const response = await apiClient.get('/categories');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.response?.status === 404) return [];
    throw error;
  }
}

export async function createCategory(data) {
  const response = await apiClient.post('/categories', {
    name: data.name?.trim(),
    description: data.description?.trim() || '',
  });
  return unwrap(response);
}

export async function updateCategory(id, data) {
  const response = await apiClient.put(`/categories/${id}`, {
    name: data.name?.trim(),
    description: data.description?.trim() || '',
  });
  return unwrap(response);
}

export async function deleteCategory(id) {
  const response = await apiClient.delete(`/categories/${id}`);
  return unwrap(response);
}

export async function forceDeleteCategory(id) {
  const response = await apiClient.delete(`/categories/${id}/force`);
  return unwrap(response);
}

export async function fetchProductsByCategory(categoryId) {
  const response = await apiClient.get(`/products/category/${categoryId}`);
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}
