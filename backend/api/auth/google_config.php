<?php
/**
 * ============================================================================
 * BAKE HOUSE - Google OAuth Public Config Endpoint
 * ============================================================================
 * Endpoint: GET /api/auth/google_config.php
 * PURPOSE:
 * Serves the Google Web Client ID configured in backend/.env to the frontend.
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use GET.'
    ], 405);
}

sendResponse([
    'success' => true,
    'client_id' => defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : ''
], 200);
