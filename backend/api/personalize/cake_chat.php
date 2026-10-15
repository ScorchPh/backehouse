<?php
// Custom cake live consultation chat

require_once __DIR__ . '/../../config/db.php';

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

// Ensure custom_cake_chats table exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS custom_cake_chats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id VARCHAR(100) NOT NULL,
            user_id INT NULL,
            sender_name VARCHAR(100) NOT NULL,
            sender_role ENUM('customer', 'admin', 'staff') NOT NULL DEFAULT 'customer',
            message TEXT NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_session (session_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $e) {}

// Fetch messages or active sessions
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action       = trim($_GET['action'] ?? '');
    $listSessions = isset($_GET['list_sessions']) && $_GET['list_sessions'] == '1';
    $sessionId    = trim($_GET['session_id'] ?? '');

    // Mark session messages as read
    if ($action === 'mark_read' && !empty($sessionId)) {
        try {
            $stmt = $pdo->prepare("UPDATE custom_cake_chats SET is_read = 1 WHERE session_id = :session_id");
            $stmt->execute(['session_id' => $sessionId]);
            sendResponse(['success' => true, 'message' => 'Session marked as read']);
        } catch (PDOException $e) {
            sendResponse(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // List all distinct customer threads (for admin)
    if ($listSessions) {
        try {
            $stmt = $pdo->query("
                SELECT 
                    session_id,
                    MAX(sender_name) AS customer_name,
                    MAX(created_at) AS last_message_at,
                    (SELECT message FROM custom_cake_chats c2 
                     WHERE c2.session_id = c1.session_id 
                     ORDER BY c2.id DESC LIMIT 1) AS last_message,
                    (SELECT sender_role FROM custom_cake_chats c2 
                     WHERE c2.session_id = c1.session_id 
                     ORDER BY c2.id DESC LIMIT 1) AS last_sender_role,
                    (SELECT id FROM custom_cake_chats c2 
                     WHERE c2.session_id = c1.session_id 
                     ORDER BY c2.id DESC LIMIT 1) AS last_message_id,
                    SUM(CASE WHEN sender_role = 'customer' AND (is_read = 0 OR is_read IS NULL) THEN 1 ELSE 0 END) AS unread_count,
                    COUNT(id) AS message_count
                FROM custom_cake_chats c1
                GROUP BY session_id
                ORDER BY last_message_at DESC
            ");
            $threads = $stmt->fetchAll();

            sendResponse([
                'success' => true,
                'threads' => $threads
            ]);
        } catch (PDOException $e) {
            sendResponse(['success' => false, 'message' => 'Failed to load threads: ' . $e->getMessage()], 500);
        }
    }

    // Fetch messages for a specific session
    if (empty($sessionId)) {
        sendResponse(['success' => false, 'message' => 'session_id is required'], 400);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT id, session_id, user_id, sender_name, sender_role, message, created_at, COALESCE(is_read, 0) AS is_read
            FROM custom_cake_chats 
            WHERE session_id = :session_id 
            ORDER BY id ASC
        ");
        $stmt->execute(['session_id' => $sessionId]);
        $messages = $stmt->fetchAll();

        sendResponse([
            'success'  => true,
            'messages' => $messages
        ]);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Failed to load messages: ' . $e->getMessage()], 500);
    }
}

// Send a chat message or mark read
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data       = getRequestBody();
    $action     = trim($data['action'] ?? '');
    $sessionId  = trim($data['session_id'] ?? '');

    if ($action === 'mark_read' && !empty($sessionId)) {
        try {
            $stmt = $pdo->prepare("UPDATE custom_cake_chats SET is_read = 1 WHERE session_id = :session_id");
            $stmt->execute(['session_id' => $sessionId]);
            sendResponse(['success' => true, 'message' => 'Session marked as read']);
        } catch (PDOException $e) {
            sendResponse(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    $senderName = trim($data['sender_name'] ?? 'Guest');
    $senderRole = trim($data['sender_role'] ?? 'customer');
    $message    = trim($data['message'] ?? '');
    $userId     = !empty($data['user_id']) ? (int)$data['user_id'] : null;

    if (empty($sessionId) || empty($message)) {
        sendResponse(['success' => false, 'message' => 'session_id and message are required'], 400);
    }

    if (!in_array($senderRole, ['customer', 'admin', 'staff'])) {
        $senderRole = 'customer';
    }

    $createdAt = date('Y-m-d H:i:s');

    try {
        $stmt = $pdo->prepare("
            INSERT INTO custom_cake_chats (session_id, user_id, sender_name, sender_role, message, created_at)
            VALUES (:session_id, :user_id, :sender_name, :sender_role, :message, :created_at)
        ");
        $stmt->execute([
            'session_id'  => $sessionId,
            'user_id'     => $userId,
            'sender_name' => $senderName,
            'sender_role' => $senderRole,
            'message'     => $message,
            'created_at'  => $createdAt
        ]);

        $newId = (int)$pdo->lastInsertId();

        sendResponse([
            'success' => true,
            'message' => 'Message sent successfully',
            'data'    => [
                'id'          => $newId,
                'session_id'  => $sessionId,
                'user_id'     => $userId,
                'sender_name' => $senderName,
                'sender_role' => $senderRole,
                'message'     => $message,
                'created_at'  => $createdAt
            ]
        ], 201);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Failed to send message: ' . $e->getMessage()], 500);
    }
}

sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
?>
