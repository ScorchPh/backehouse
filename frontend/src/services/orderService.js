/**
 * ============================================================================
 * BAKE HOUSE - Order Service
 * ============================================================================
 * Capstone Project Explanation:
 * Handles orders, custom cake submissions, and order status lifecycle:
 * - /api/orders/create_order.php (Place order at checkout)
 * - /api/orders/get_orders.php (View all orders or "My Orders")
 * - /api/orders/get_order_details.php (View single order details)
 * - /api/orders/update_order_status.php (Admin/Staff status update)
 * - /api/personalize/submit_custom_cake.php (Save custom cake design)
 * ============================================================================
 */

import { apiRequest } from './apiClient';

export const orderService = {
  /**
   * Place an order from checkout
   */
  async createOrder(orderPayload) {
    return await apiRequest('/orders/create_order.php', {
      method: 'POST',
      body: orderPayload,
    });
  },

  /**
   * Fetch orders (all for admin/staff, or filtered by user_id for customer)
   */
  async getOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.userId) query.append('user_id', params.userId);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest(`/orders/get_orders.php${qs}`, { method: 'GET' });
  },

  /**
   * Fetch complete order breakdown by Order ID
   */
  async getOrderDetails(orderId) {
    return await apiRequest(`/orders/get_order_details.php?id=${encodeURIComponent(orderId)}`, {
      method: 'GET',
    });
  },

  /**
   * Admin / Staff: Update status of an order
   * Allowed statuses: 'Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'For Delivery', 'Completed', 'Cancelled', 'Denied'
   */
  async updateOrderStatus(orderId, newStatus, reason = null) {
    return await apiRequest('/orders/update_order_status.php', {
      method: 'POST',
      body: {
        id: orderId,
        status: newStatus,
        reason: reason,
      },
    });
  },

  /**
   * Submit personalized cake inquiry / design
   */
  async submitCustomCake(cakeData) {
    return await apiRequest('/personalize/submit_custom_cake.php', {
      method: 'POST',
      body: cakeData,
    });
  },
};
