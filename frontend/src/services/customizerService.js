/**
 * ============================================================================
 * BAKE HOUSE - Cake Customizer Service
 * ============================================================================
 */

import { apiRequest } from './apiClient';

export const customizerService = {
  /**
   * Fetch active cake customizer options (sizes, flavors, shapes, colors, occasions, base price)
   */
  async getCustomizerOptions() {
    return await apiRequest('/personalize/get_customizer_options.php', { method: 'GET' });
  },

  /**
   * Admin: Save updated cake customizer options
   */
  async saveCustomizerOptions(optionsData) {
    return await apiRequest('/personalize/save_customizer_options.php', {
      method: 'POST',
      body: optionsData,
    });
  }
};
