<?php
// Get user profile details by id or email

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$id    = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$email = strtolower(trim($_GET['email'] ?? ''));

if ($id <= 0 && empty($email)) {
    sendResponse(['success' => false, 'message' => 'User ID or Email is required.'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    $fields = "id, username, first_name, last_name, email, contact_number, role, avatar, created_at, default_street, default_barangay, default_city, default_province, default_landmark, default_lat, default_lng, address";
    
    if ($id > 0) {
        $stmt = $pdo->prepare("SELECT {$fields} FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
    } else {
        $stmt = $pdo->prepare("SELECT {$fields} FROM users WHERE LOWER(email) = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
    }

    $user = $stmt->fetch();

    if ($user) {
        sendResponse([
            'success' => true,
            'message' => 'Profile retrieved successfully.',
            'user'    => $user
        ]);
    } else {
        sendResponse([
            'success' => false,
            'message' => 'User account not found.'
        ], 404);
    }

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
