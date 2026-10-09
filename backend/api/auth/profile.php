<?php
// get user profile details by id or email

require_once __DIR__ . '/../../config/db.php';

// only allow GET method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use GET.'
    ], 405);
}

// check if id or email was passed
$id    = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$email = strtolower(trim($_GET['email'] ?? ''));

if ($id <= 0 && empty($email)) {
    sendResponse([
        'success' => false,
        'message' => 'User ID or Email is required.'
    ], 400);
}

// try looking up in mysql first
$pdo = getDBConnection();
$userFound = null;

if ($pdo) {
    try {
        // don't select the password field for safety
        $fields = "id, username, first_name, last_name, email, contact_number, role, avatar, created_at, default_street, default_barangay, default_city, default_province, default_landmark, default_lat, default_lng, address";
        if ($id > 0) {
            // using prepared statement to prevent sql injection
            $stmt = $pdo->prepare("SELECT {$fields} FROM users WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $id]);
        } else {
            $stmt = $pdo->prepare("SELECT {$fields} FROM users WHERE LOWER(email) = :email LIMIT 1");
            $stmt->execute(['email' => $email]);
        }

        $user = $stmt->fetch();
        if ($user) {
            $userFound = $user;
        }
    } catch (PDOException $e) {
        // if mysql errors out, we just continue to json file fallback
        error_log("mysql profile notice: " . $e->getMessage());
    }
}

// if mysql is offline or user not found there, check users.json
if (!$userFound) {
    $users = readDataStore('users');
    foreach ($users as $u) {
        if (($id > 0 && (int)$u['id'] === $id) || (!empty($email) && strtolower($u['email']) === $email)) {
            // make sure password is removed before sending
            unset($u['password']);
            $userFound = $u;
            break;
        }
    }
}

// send back user data or 404
if ($userFound) {
    sendResponse([
        'success' => true,
        'message' => 'Profile retrieved successfully.',
        'user'    => $userFound
    ], 200);
} else {
    sendResponse([
        'success' => false,
        'message' => 'User account not found.'
    ], 404);
}
?>
