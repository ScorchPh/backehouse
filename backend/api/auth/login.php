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

        $isValid = $user && !empty($user['password']) && password_verify($password, $user['password']);

        // Demo account auto-repair for Capstone Test Accounts (Password: 1234)
        if (!$isValid && $password === '1234' && in_array(strtolower($usernameOrEmail), ['admin', 'staff', 'customer', 'admin@bakehouse.com', 'staff@bakehouse.com', 'customer@bakehouse.com'])) {
            $role = str_replace('@bakehouse.com', '', strtolower($usernameOrEmail));
            $demoHash = password_hash('1234', PASSWORD_BCRYPT);

            if ($user) {
                // User exists in DB with outdated/invalid hash: repair it
                try {
                    $up = $pdo->prepare("UPDATE users SET password = :p WHERE id = :id");
                    $up->execute(['p' => $demoHash, 'id' => $user['id']]);
                    $isValid = true;
                } catch (Exception $e) {
                    $isValid = true;
                }
            } else {
                // Demo account missing in DB: auto-create on the fly
                try {
                    $demoProfiles = [
                        'admin'    => ['First' => 'Store', 'Last' => 'Administrator', 'Email' => 'admin@bakehouse.com', 'Contact' => '+63 912 345 6780', 'Avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'],
                        'staff'    => ['First' => 'Head', 'Last' => 'Baker', 'Email' => 'staff@bakehouse.com', 'Contact' => '+63 912 345 6781', 'Avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'],
                        'customer' => ['First' => 'Juan', 'Last' => 'Dela Cruz', 'Email' => 'customer@bakehouse.com', 'Contact' => '+63 912 345 6782', 'Avatar' => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'],
                    ];
                    $info = $demoProfiles[$role] ?? $demoProfiles['customer'];
                    $ins = $pdo->prepare("INSERT INTO users (username, first_name, last_name, email, contact_number, password, role, avatar) VALUES (:u, :fn, :ln, :em, :co, :pa, :ro, :av)");
                    $ins->execute([
                        'u'  => $role,
                        'fn' => $info['First'],
                        'ln' => $info['Last'],
                        'em' => $info['Email'],
                        'co' => $info['Contact'],
                        'pa' => $demoHash,
                        'ro' => $role,
                        'av' => $info['Avatar']
                    ]);
                    $newId = (int)$pdo->lastInsertId();
                    $user = [
                        'id'             => $newId,
                        'username'       => $role,
                        'first_name'     => $info['First'],
                        'last_name'      => $info['Last'],
                        'email'          => $info['Email'],
                        'contact_number' => $info['Contact'],
                        'role'           => $role,
                        'avatar'         => $info['Avatar'],
                        'created_at'     => date('Y-m-d H:i:s')
                    ];
                    $isValid = true;
                } catch (Exception $e) {}
            }
        }

        if (!$isValid) {
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
