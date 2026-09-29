/**
 * ============================================================================
 * BAKE HOUSE - Custom Cake Live Consultation Chat Service
 * ============================================================================
 */

import { apiRequest } from './apiClient';

export const cakeChatService = {
  /**
   * Fetch chat history for a customer's conversation session
   */
  async getMessages(sessionId) {
    return apiRequest(`/personalize/cake_chat.php?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'GET'
    });
  },

  /**
   * Send a chat message (customer or admin/staff)
   */
  async sendMessage({ sessionId, senderName, senderRole, message, userId }) {
    return apiRequest('/personalize/cake_chat.php', {
      method: 'POST',
      body: {
        session_id: sessionId,
        sender_name: senderName,
        sender_role: senderRole || 'customer',
        message: message,
        user_id: userId || null
      }
    });
  },

  /**
   * (Admin) Fetch all customer consultation sessions
   */
  async getActiveSessions() {
    return apiRequest('/personalize/cake_chat.php?list_sessions=1', {
      method: 'GET'
    });
  }
};
