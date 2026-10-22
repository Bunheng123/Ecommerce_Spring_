import apiClient from './apiClient';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

/**
 * Fetch report summary telemetry, KPIs, best sellers, and sales over time.
 * @param {Object} params
 * @param {string} [params.startDate] - YYYY-MM-DD
 * @param {string} [params.endDate] - YYYY-MM-DD
 * @param {string} [params.channel] - ALL, RETAIL, or WHOLESALE
 * @param {number|string} [params.categoryId]
 * @param {number|string} [params.brandId]
 * @param {boolean} [params.unbrandedOnly]
 */
export async function fetchReportSummary(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.channel && params.channel !== 'ALL') queryParams.append('channel', params.channel);
  if (params.categoryId) queryParams.append('categoryId', params.categoryId);
  if (params.brandId) queryParams.append('brandId', params.brandId);
  if (params.unbrandedOnly) queryParams.append('unbrandedOnly', 'true');

  const url = queryParams.toString() ? `/reports/summary?${queryParams.toString()}` : '/reports/summary';
  const response = await apiClient.get(url);
  return unwrap(response);
}
