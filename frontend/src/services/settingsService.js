/**
 * ============================================================================
 * BAKE HOUSE - Store Settings Service
 * ============================================================================
 * Manages bakery configuration: contact details, customized social media links,
 * and store operational toggles.
 * ============================================================================
 */

import { apiRequest } from './apiClient';

const DEFAULT_SETTINGS = {
  bakery_name: 'BAKE HOUSE',
  email: 'info@bakehouse.com',
  contact_number: '0917-123-4567',
  address: 'Poblacion, Cordova, Cebu, Philippines',
  social_links: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    tiktok: 'https://tiktok.com'
  },
  order_settings: {
    accept_orders: true,
    allow_customization: true
  }
};

export const settingsService = {
  /**
   * Fetch current store settings (with local caching for instant loads)
   */
  async getSettings() {
    try {
      const res = await apiRequest('/settings/get_settings.php', { method: 'GET' });
      if (res && res.success && res.settings) {
        localStorage.setItem('bh_store_settings', JSON.stringify(res.settings));
        return res.settings;
      }
    } catch (err) {
      console.warn('Could not fetch store settings from server, falling back to cache:', err);
    }

    // Fallback to local storage or defaults
    try {
      const cached = localStorage.getItem('bh_store_settings');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }

    return DEFAULT_SETTINGS;
  },

  /**
   * Update store settings
   */
  async updateSettings(payload) {
    const res = await apiRequest('/settings/update_settings.php', {
      method: 'POST',
      body: payload
    });

    if (res && res.success && res.settings) {
      localStorage.setItem('bh_store_settings', JSON.stringify(res.settings));
      window.dispatchEvent(new CustomEvent('storeSettingsUpdated', { detail: res.settings }));
    }

    return res;
  },

  /**
   * Helper to get cached settings synchronously
   */
  getCachedSettings() {
    try {
      const cached = localStorage.getItem('bh_store_settings');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  }
};
