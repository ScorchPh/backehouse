<?php
/**
 * ============================================================================
 * BAKE HOUSE - Custom Cake Live Consultation Chat API Endpoint
 * ============================================================================
 * Endpoint: /api/personalize/cake_chat.php
 *
 * METHODS:
 *   - GET  ?session_id=...       : Fetch chat messages for a specific session
 *   - GET  ?list_sessions=1      : (Admin) List all active chat sessions with latest message
 *   - POST { session_id, sender_name, sender_role, message, user_id } : Send a chat message
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

$pdo = getDBConnection();

// ----------------------------------------------------------------------------
// GET: Fetch Messages or Active Chat Sessions
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $listSessions = isset($_GET['list_sessions']) && $_GET['list_sessions'] == '1';
    $sessionId    = trim($_GET['session_id'] ?? '');

    // Option A: Admin fetching list of distinct customer chat threads
    if ($listSessions) {
        if ($pdo) {
            try {
                $stmt = $pdo->query("
                    SELECT 
                        session_id,
                        MAX(sender_name) AS customer_name,
                        MAX(created_at) AS last_message_at,
                        (SELECT message FROM custom_cake_chats c2 
                         WHERE c2.session_id = c1.session_id 
                         ORDER BY c2.id DESC LIMIT 1) AS last_message,
                        COUNT(id) AS message_count
                    FROM custom_cake_chats c1
                    GROUP BY session_id
                    ORDER BY last_message_at DESC
                ");
                $threads = $stmt->fetchAll(PDO::FETCH_ASSOC);

                sendResponse([
                    'success' => true,
                    'threads' => $threads
                ]);
            } catch (PDOException $e) {
                // Table might not exist yet or query failed; fallback
            }
        }

        // Fallback: Read from JSON
        $allChats = readDataStore('custom_cake_chats');
        $grouped = [];
        foreach ($allChats as $chat) {
            $sid = $chat['session_id'] ?? 'default';
            $isCustomer = ($chat['sender_role'] ?? '') === 'customer';
            $sender = $chat['sender_name'] ?? 'Customer';

            if (!isset($grouped[$sid])) {
                $grouped[$sid] = [
                    'session_id'      => $sid,
                    'customer_name'   => $isCustomer ? $sender : 'Customer',
                    'last_message'    => $chat['message'] ?? '',
                    'last_message_at' => $chat['created_at'] ?? date('Y-m-d H:i:s'),
                    'message_count'   => 1
                ];
            } else {
                if ($isCustomer && $sender !== 'Customer') {
                    $grouped[$sid]['customer_name'] = $sender;
                }
                $grouped[$sid]['last_message']    = $chat['message'] ?? '';
                $grouped[$sid]['last_message_at'] = $chat['created_at'] ?? date('Y-m-d H:i:s');
                $grouped[$sid]['message_count']++;
            }
        }
        sendResponse([
            'success' => true,
            'threads' => array_values($grouped)
        ]);
    }

    // Option B: Fetch all messages for a specific conversation session
    if (empty($sessionId)) {
        sendResponse([
            'success' => false,
            'message' => 'session_id query parameter is required.'
        ], 400);
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("
                SELECT id, session_id, user_id, sender_name, sender_role, message, created_at 
                FROM custom_cake_chats 
                WHERE session_id = :session_id 
                ORDER BY id ASC
            ");
            $stmt->execute([':session_id' => $sessionId]);
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

            sendResponse([
                'success'  => true,
                'messages' => $messages
            ]);
        } catch (PDOException $e) {
            // Fallback to JSON below
        }
    }

    // Fallback: JSON store
    $allChats = readDataStore('custom_cake_chats');
    $filtered = array_filter($allChats, function ($m) use ($sessionId) {
        return ($m['session_id'] ?? '') === $sessionId;
    });

    sendResponse([
        'success'  => true,
        'messages' => array_values($filtered)
    ]);
}

// ----------------------------------------------------------------------------
// POST: Send New Chat Message
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data       = getRequestBody();
    $sessionId  = trim($data['session_id'] ?? '');
    $senderName = trim($data['sender_name'] ?? 'Guest');
    $senderRole = trim($data['sender_role'] ?? 'customer');
    $message    = trim($data['message'] ?? '');
    $userId     = !empty($data['user_id']) ? (int)$data['user_id'] : null;

    if (empty($sessionId) || empty($message)) {
        sendResponse([
            'success' => false,
            'message' => 'session_id and message are required.'
        ], 400);
    }

    // Validate sender_role
    if (!in_array($senderRole, ['customer', 'admin', 'staff'])) {
        $senderRole = 'customer';
    }

    $createdAt = date('Y-m-d H:i:s');

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO custom_cake_chats (session_id, user_id, sender_name, sender_role, message, created_at)
                VALUES (:session_id, :user_id, :sender_name, :sender_role, :message, :created_at)
            ");
            $stmt->execute([
                ':session_id'  => $sessionId,
                ':user_id'     => $userId,
                ':sender_name' => $senderName,
                ':sender_role' => $senderRole,
                ':message'     => $message,
                ':created_at'  => $createdAt
            ]);

            $newId = (int)$pdo->lastInsertId();

            sendResponse([
                'success' => true,
                'message' => 'Message sent successfully.',
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
            // Fallback to JSON below
        }
    }

    // Fallback: JSON Store
    $allChats = readDataStore('custom_cake_chats');
    $newEntry = [
        'id'          => count($allChats) + 1,
        'session_id'  => $sessionId,
        'user_id'     => $userId,
        'sender_name' => $senderName,
        'sender_role' => $senderRole,
        'message'     => $message,
        'created_at'  => $createdAt
    ];
    $allChats[] = $newEntry;
    writeDataStore('custom_cake_chats', $allChats);

    sendResponse([
        'success' => true,
        'message' => 'Message sent successfully (JSON store).',
        'data'    => $newEntry
    ], 201);
}

sendResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
