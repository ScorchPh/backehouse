<?php
/**
 * ============================================================================
 * BAKE HOUSE - Customers List API Endpoint (Admin / Staff)
 * Endpoint: GET /api/auth/customers.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$pdo = getDBConnection();

if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT id, username, first_name, last_name, email, contact_number, role, avatar, created_at FROM users ORDER BY created_at DESC");
        $customers = $stmt->fetchAll();
        sendResponse(['success' => true, 'count' => count($customers), 'customers' => $customers], 200);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $users = readDataStore('users');
    $sanitized = array_map(function($u) {
        unset($u['password']);
        return $u;
    }, $users);
    sendResponse(['success' => true, 'count' => count($sanitized), 'customers' => $sanitized], 200);
}
?>
