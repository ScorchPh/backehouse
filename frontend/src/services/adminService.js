/**
 * ============================================================================
 * BAKE HOUSE - Admin & Analytics Service
 * ============================================================================
 * Capstone Project Explanation:
 * Aggregates analytical statistics and reporting data:
 * - /api/admin/dashboard_stats.php (KPI cards, recent orders, bestsellers)
 * - /api/admin/reports.php (Category sales, payment breakdowns, monthly history)
 * ============================================================================
 */

import { apiRequest } from './apiClient';

export const adminService = {
  /**
   * Fetch live dashboard statistics
   */
  async getDashboardStats() {
    return await apiRequest('/admin/dashboard_stats.php', { method: 'GET' });
  },

  /**
   * Fetch analytical sales reports
   */
  async getReports() {
    return await apiRequest('/admin/reports.php', { method: 'GET' });
  },
};
