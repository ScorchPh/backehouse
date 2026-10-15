<?php
// Get contact inquiries from database

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
        SELECT id, name, email, subject, message, created_at,
               DATE_FORMAT(created_at, '%M %d, %Y - %h:%i %p') as formatted_date
        FROM messages 
        ORDER BY created_at DESC
    ");
    $messages = $stmt->fetchAll();

    sendResponse([
        'success'  => true,
        'count'    => count($messages),
        'messages' => $messages
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
