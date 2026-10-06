import apiClient from './apiClient';

/**
 * Get current authenticated user's order history
 * GET /api/orders/my
 * @returns {Promise<Array>} List of orders
 */
export async function getMyOrders() {
  const response = await apiClient.get('/orders/my');
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Get a specific order by ID (ownership enforced by backend)
 * GET /api/orders/{id}
 * @param {string|number} id
 * @returns {Promise<Object>} Order details
 */
export async function getOrderById(id) {
  const response = await apiClient.get(`/orders/${id}`);
  return response.data?.data ?? response.data;
}

/**
 * Self-cancel an order within 2 hours of orderDate
 * POST /api/orders/{id}/cancel
 * @param {string|number} id
 * @returns {Promise<Object>} Updated order details
 */
export async function cancelOrder(id) {
  const response = await apiClient.post(`/orders/${id}/cancel`);
  return response.data?.data ?? response.data;
}

// Aliases for compatibility
export const fetchMyOrders = getMyOrders;
export const fetchOrderById = getOrderById;

/**
 * Admin: Get all customer orders
 * GET /api/orders
 * @returns {Promise<Array>} List of all orders
 */
export async function getAllOrders() {
  const response = await apiClient.get('/orders');
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Admin: Update customer order status (PENDING, CONFIRMED, COMPLETED, CANCELLED)
 * PUT /api/orders/{id}
 * @param {string|number} id
 * @param {string} status
 * @returns {Promise<Object>}
 */
export async function updateOrderStatus(id, status) {
  const response = await apiClient.put(`/orders/${id}`, { status });
  return response.data?.data ?? response.data;
}

/**
 * Admin: Update customer order payment status (UNPAID, PAID, REFUNDED)
 * PUT /api/orders/{id}/payment-status
 * @param {string|number} id
 * @param {string} paymentStatus
 * @returns {Promise<Object>}
 */
export async function updatePaymentStatus(id, paymentStatus) {
  const response = await apiClient.put(`/orders/${id}/payment-status`, { paymentStatus });
  return response.data?.data ?? response.data;
}

export const SAMPLE_ORDERS = [
  {
    id: 1024,
    displayDate: 'Oct 24, 2025',
    itemSummary: 'Chrono Minimalist Ref. 01, +2 more',
    totalAmount: 605.0,
    paymentStatus: 'PAID',
    status: 'COMPLETED',
  },
  {
    id: 1023,
    displayDate: 'Oct 22, 2025',
    itemSummary: 'Tactile Pen Spec. B',
    totalAmount: 120.0,
    paymentStatus: 'PAID',
    status: 'COMPLETED',
  },
  {
    id: 1022,
    displayDate: 'Oct 20, 2025',
    itemSummary: 'Anodized Card Ledger',
    totalAmount: 145.0,
    paymentStatus: 'UNPAID',
    status: 'PENDING',
  },
];

