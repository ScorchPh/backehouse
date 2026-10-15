<?php
// Get list of registered customers for admin management

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    $stmt = $pdo->query("
        SELECT id, username, first_name, last_name, email, contact_number, role, avatar, created_at 
        FROM users 
        ORDER BY created_at DESC
    ");
    $customers = $stmt->fetchAll();

    sendResponse([
        'success'   => true,
        'count'     => count($customers),
        'customers' => $customers
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
