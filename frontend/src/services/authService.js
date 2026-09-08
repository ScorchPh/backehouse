/**
 * ============================================================================
 * BAKE HOUSE - Authentication Service
 * ============================================================================
 * Capstone Project Explanation:
 * Handles client-side user sessions and connects to:
 * - /api/auth/login.php (3-role login for Admin, Staff, Customer)
 * - /api/auth/register.php (Customer signup)
 * - /api/auth/google_login.php (Google OAuth SSO)
 * - /api/auth/customers.php (Admin customer list)
 * ============================================================================
 */

import { apiRequest } from './apiClient';

const USER_STORAGE_KEY = 'bakehouse_active_user';

export const authService = {
  /**
   * Log in with username or email and password
   */
  async login(usernameOrEmail, password) {
    const data = await apiRequest('/auth/login.php', {
      method: 'POST',
      body: {
        username: usernameOrEmail,
        password: password,
      },
    });

    if (data.success && data.user) {
      this.setCurrentUser(data.user);
    }
    return data;
  },

  /**
   * Register a new customer account
   */
  async register(registrationData) {
    const data = await apiRequest('/auth/register.php', {
      method: 'POST',
      body: registrationData,
    });

    if (data.success && data.user) {
      this.setCurrentUser(data.user);
    }
    return data;
  },

  /**
   * Single Sign-On using Google Account
   */
  async googleLogin(googleProfile) {
    const data = await apiRequest('/auth/google_login.php', {
      method: 'POST',
      body: googleProfile,
    });

    if (data.success && data.user) {
      this.setCurrentUser(data.user);
    }
    return data;
  },

  /**
   * Get active user from browser localStorage
   */
  getCurrentUser() {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Save user session to localStorage
   */
  setCurrentUser(user) {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      // Dispatch custom event to notify components like Navbar
      window.dispatchEvent(new Event('authChange'));
    } catch (e) {
      console.error('Failed to save user session', e);
    }
  },

  /**
   * Log out active user
   */
  logout() {
    localStorage.removeItem(USER_STORAGE_KEY);
    window.dispatchEvent(new Event('authChange'));
  },

  /**
   * Check if active user has a specific role
   */
  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.role === role;
  },

  /**
   * Admin / Staff: Get list of registered customers
   */
  async getCustomers() {
    return await apiRequest('/auth/customers.php', { method: 'GET' });
  }
};
