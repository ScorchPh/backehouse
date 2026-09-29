<?php
/**
 * ============================================================================
 * BAKE HOUSE - User Login API Endpoint
 * ============================================================================
 * Endpoint: POST /api/auth/login.php
 * Accepts: JSON payload with { "username": "...", "password": "..." }
 * Roles: Admin, Staff, Customer
 *
 * PURPOSE:
 * Authenticates users using Bcrypt password hashing (`password_verify`).
 * Supports logging in with either username OR email address.
 * Returns authenticated user object (stripping sensitive password hash).
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// STEP 1: Load Database Configuration & Helpers
// ----------------------------------------------------------------------------
require_once __DIR__ . '/../../config/db.php';


// ----------------------------------------------------------------------------
// STEP 2: Enforce HTTP Method Verification
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use POST.'
    ], 405);
}


// ----------------------------------------------------------------------------
// STEP 3: Receive and Validate Login Credentials
// ----------------------------------------------------------------------------
$data            = getRequestBody();
$usernameOrEmail = strtolower(trim($data['username'] ?? $data['email'] ?? ''));
$password        = trim($data['password'] ?? '');

if (empty($usernameOrEmail) || empty($password)) {
    sendResponse([
        'success' => false,
        'message' => 'Please provide both username/email and password.'
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 4: Authenticate User (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        // Find matching record by lowercase username or lowercase email
        $stmt = $pdo->prepare("
            SELECT id, username, first_name, last_name, email, contact_number, password, role, avatar, created_at 
            FROM users 
            WHERE LOWER(username) = :username OR LOWER(email) = :email 
            LIMIT 1
        ");
        $stmt->execute([
            'username' => $usernameOrEmail,
            'email'    => $usernameOrEmail
        ]);
        $user = $stmt->fetch();

        // Verify hash using PHP's native secure password_verify()
        if (!$user || !password_verify($password, $user['password'])) {
            sendResponse([
                'success' => false,
                'message' => 'Invalid username/email or password.'
            ], 401);
        }

        // CRITICAL SECURITY: Never leak password hash back to the frontend
        unset($user['password']);

        sendResponse([
            'success' => true,
            'message' => 'Login successful! Welcome back, ' . htmlspecialchars($user['first_name']) . '.',
            'user'    => $user
        ], 200);

    } catch (PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ], 500);
    }

} else {
    // ------------------------------------------------------------------------
    // CASE B: Offline / Fallback Mode (Using JSON file store)
    // ------------------------------------------------------------------------
    $users       = readDataStore('users');
    $matchedUser = null;

    foreach ($users as $u) {
        if (strtolower($u['username']) === $usernameOrEmail || strtolower($u['email']) === $usernameOrEmail) {
            // Support Bcrypt verify or default student password '1234'
            if (password_verify($password, $u['password']) || $password === '1234') {
                $matchedUser = $u;
                break;
            }
        }
    }

    if (!$matchedUser) {
        sendResponse([
            'success' => false,
            'message' => 'Invalid username/email or password.'
        ], 401);
    }

    // Strip password hash
    unset($matchedUser['password']);

    sendResponse([
        'success' => true,
        'message' => 'Login successful! Welcome back, ' . htmlspecialchars($matchedUser['first_name']) . '.',
        'user'    => $matchedUser
    ], 200);
}
?>
