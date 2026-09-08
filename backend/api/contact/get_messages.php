<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Contact Messages API Endpoint (Admin)
 * Endpoint: GET /api/contact/get_messages.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$pdo = getDBConnection();

if ($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT id, name, email, subject, message, created_at,
                   DATE_FORMAT(created_at, '%M %d, %Y - %h:%i %p') as formatted_date
            FROM messages 
            ORDER BY created_at DESC
        ");
        $messages = $stmt->fetchAll();
        sendResponse(['success' => true, 'count' => count($messages), 'messages' => $messages], 200);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $messages = readDataStore('messages');
    sendResponse(['success' => true, 'count' => count($messages), 'messages' => $messages], 200);
}
?>
