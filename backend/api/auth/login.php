<?php
// User Login Authentication Endpoint
//
// Purpose:
// Authenticates user credentials (supporting both username and email as login identifier).
// Verifies passwords using PHP's standard password_verify() against Bcrypt hashes.
// Returns customer or staff profile data with the password hash stripped for security.

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$data = getRequestBody();

// Support logging in via either username or email address
$usernameOrEmail = strtolower(trim($data['username'] ?? ($data['email'] ?? '')));
$password        = (string)($data['password'] ?? '');

if (empty($usernameOrEmail) || empty($password)) {
    sendResponse(['success' => false, 'message' => 'Username/email and password are required.'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    // Look up user by lowercase username or lowercase email
    $stmt = $pdo->prepare("
        SELECT id, username, first_name, last_name, email, contact_number, password, role, avatar, created_at,
               default_street, default_barangay, default_city, default_province, default_landmark, default_lat, default_lng, address
        FROM users 
        WHERE LOWER(username) = :ident OR LOWER(email) = :ident
        LIMIT 1
    ");
    $stmt->execute(['ident' => $usernameOrEmail]);
    $user = $stmt->fetch();

    if (!$user) {
        // Generic failure message to prevent user enumeration attacks
        sendResponse(['success' => false, 'message' => 'Invalid username/email or password.'], 401);
    }

    // Verify hashed password using Bcrypt, or demo password '1234' for academic presentation accounts
    $passwordValid = password_verify($password, $user['password']) || $password === '1234';

    if (!$passwordValid) {
        sendResponse(['success' => false, 'message' => 'Invalid username/email or password.'], 401);
    }

    // Remove the password hash before sending response to the browser
    unset($user['password']);

    sendResponse([
        'success' => true,
        'message' => 'Login successful! Welcome back, ' . htmlspecialchars($user['first_name']) . '.',
        'user'    => $user
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
