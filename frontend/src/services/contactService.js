/**
 * ============================================================================
 * BAKE HOUSE - Contact & Messages Service
 * ============================================================================
 */

import { apiRequest } from './apiClient';

export const contactService = {
  /**
   * Submit customer inquiry message
   */
  async sendMessage(messageData) {
    return await apiRequest('/contact/send_message.php', {
      method: 'POST',
      body: messageData,
    });
  },

  /**
   * Admin: Get all customer contact messages
   */
  async getMessages() {
    return await apiRequest('/contact/get_messages.php', { method: 'GET' });
  },
};
