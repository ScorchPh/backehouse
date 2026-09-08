/**
 * ============================================================================
 * BAKE HOUSE - Centralized API Client Wrapper
 * ============================================================================
 * Capstone Project Explanation:
 * Provides a unified HTTP request handler using standard JavaScript `fetch`.
 * - Sets default JSON headers ('Content-Type': 'application/json').
 * - Handles base URL resolution (/api).
 * - Standardizes error handling and JSON parsing across all frontend services.
 * ============================================================================
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backehouse.onrender.com/api';

/**
 * Core request wrapper
 * 
 * @param {string} endpoint e.g. '/auth/login.php'
 * @param {object} options fetch options (method, body, headers, etc.)
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}
