<?php
/**
 * ============================================================================
 * BAKE HOUSE - User Profile Endpoint
 * Endpoint: GET /api/auth/profile.php?id=X
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$email = strtolower(trim($_GET['email'] ?? ''));

if ($id <= 0 && empty($email)) {
    sendResponse(['success' => false, 'message' => 'User ID or Email is required.'], 400);
}

$pdo = getDBConnection();

if ($pdo) {
    try {
        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT id, username, first_name, last_name, email, contact_number, role, avatar, created_at FROM users WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $id]);
        } else {
            $stmt = $pdo->prepare("SELECT id, username, first_name, last_name, email, contact_number, role, avatar, created_at FROM users WHERE LOWER(email) = :email LIMIT 1");
            $stmt->execute(['email' => $email]);
        }

        $user = $stmt->fetch();
        if (!$user) sendResponse(['success' => false, 'message' => 'User not found.'], 404);
        sendResponse(['success' => true, 'user' => $user], 200);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $users = readDataStore('users');
    foreach ($users as $u) {
        if (($id > 0 && (int)$u['id'] === $id) || (!empty($email) && strtolower($u['email']) === $email)) {
            unset($u['password']);
            sendResponse(['success' => true, 'user' => $u], 200);
        }
    }
    sendResponse(['success' => false, 'message' => 'User not found.'], 404);
}
?>
