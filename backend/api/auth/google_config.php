<?php
// Return Google OAuth Client ID for frontend

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

sendResponse([
    'success'   => true,
    'client_id' => defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : ''
]);
?>
