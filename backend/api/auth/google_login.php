<?php
/**
 * ============================================================================
 * BAKE HOUSE - Google OAuth Sign-In & Registration API Endpoint
 * ============================================================================
 * Endpoint: POST /api/auth/google_login.php
 * Accepts: JSON payload { email, google_id, name, first_name, last_name, avatar }
 *
 * PURPOSE:
 * Handles seamless Single Sign-On (SSO) with Google:
 * 1. If user already exists by email or google_id -> logs them in & updates avatar/google_id.
 * 2. If new user -> automatically registers them as a 'customer' with their Google credentials.
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
// STEP 3: Receive and Sanitize Google Profile Data
// ----------------------------------------------------------------------------
$data      = getRequestBody();
$email     = strtolower(trim($data['email'] ?? ''));
$googleId  = trim($data['google_id'] ?? $data['sub'] ?? 'google_' . time());
$name      = trim($data['name'] ?? '');
$firstName = trim($data['first_name'] ?? $data['given_name'] ?? '');
$lastName  = trim($data['last_name'] ?? $data['family_name'] ?? '');
$avatar    = trim($data['avatar'] ?? $data['picture'] ?? 'https://lh3.googleusercontent.com/a/default-user=s96-c');

if (empty($email)) {
    sendResponse([
        'success' => false,
        'message' => 'Google email is required.'
    ], 400);
}

// Split full name if individual first/last names were not provided
if (empty($firstName)) {
    $nameParts = explode(' ', $name, 2);
    $firstName = $nameParts[0] ?? 'Google';
    $lastName  = $nameParts[1] ?? 'User';
}

$baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $email)[0])) ?: 'google_user';


// ----------------------------------------------------------------------------
// STEP 4: Authenticate or Register User (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        // Look up user by email or google_id
        $stmt = $pdo->prepare("
            SELECT id, username, first_name, last_name, email, contact_number, role, avatar, google_id 
            FROM users 
            WHERE email = :email OR (google_id IS NOT NULL AND google_id = :google_id) 
            LIMIT 1
        ");
        $stmt->execute([
            'email'     => $email,
            'google_id' => $googleId
        ]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Existing user: Link Google ID if not yet linked and update avatar
            $update = $pdo->prepare("
                UPDATE users 
                SET google_id = COALESCE(google_id, :google_id), avatar = COALESCE(:avatar, avatar) 
                WHERE id = :id
            ");
            $update->execute([
                'google_id' => $googleId,
                'avatar'    => $avatar,
                'id'        => $existing['id']
            ]);

            $existing['avatar'] = $avatar ?: $existing['avatar'];

            sendResponse([
                'success' => true,
                'message' => 'Google sign-in successful! Welcome back, ' . $existing['first_name'],
                'user'    => $existing
            ], 200);

        } else {
            // New user: Generate unique username
            $username = $baseUsername;
            $counter  = 1;
            while (true) {
                $check = $pdo->prepare("SELECT id FROM users WHERE username = :username LIMIT 1");
                $check->execute(['username' => $username]);
                if (!$check->fetch()) break;
                $username = $baseUsername . $counter++;
            }

            // Create new Google customer record
            $insert = $pdo->prepare("
                INSERT INTO users (username, first_name, last_name, email, role, google_id, avatar) 
                VALUES (:username, :first_name, :last_name, :email, 'customer', :google_id, :avatar)
            ");
            $insert->execute([
                'username'   => $username,
                'first_name' => $firstName,
                'last_name'  => $lastName,
                'email'      => $email,
                'google_id'  => $googleId,
                'avatar'     => $avatar
            ]);

            $newId = (int)$pdo->lastInsertId();

            sendResponse([
                'success' => true,
                'message' => 'Google account registered and logged in successfully!',
                'user'    => [
                    'id'             => $newId,
                    'username'       => $username,
                    'first_name'     => $firstName,
                    'last_name'      => $lastName,
                    'email'          => $email,
                    'contact_number' => '',
                    'role'           => 'customer',
                    'avatar'         => $avatar
                ]
            ], 201);
        }

    } catch (PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Google auth DB error: ' . $e->getMessage()
        ], 500);
    }

} else {
    // ------------------------------------------------------------------------
    // CASE B: Offline / Fallback Mode (Using JSON file store)
    // ------------------------------------------------------------------------
    $users      = readDataStore('users');
    $foundIndex = -1;

    foreach ($users as $index => $u) {
        if (strtolower($u['email']) === $email || (isset($u['google_id']) && $u['google_id'] === $googleId)) {
            $foundIndex = $index;
            break;
        }
    }

    if ($foundIndex >= 0) {
        $users[$foundIndex]['avatar']    = $avatar;
        $users[$foundIndex]['google_id'] = $googleId;
        writeDataStore('users', $users);

        $userObj = $users[$foundIndex];
        unset($userObj['password']);

        sendResponse([
            'success' => true,
            'message' => 'Google sign-in successful! Welcome back, ' . $userObj['first_name'],
            'user'    => $userObj
        ], 200);

    } else {
        $newId   = count($users) > 0 ? max(array_column($users, 'id')) + 1 : 1;
        $newUser = [
            'id'             => $newId,
            'username'       => $baseUsername . rand(10, 99),
            'first_name'     => $firstName,
            'last_name'      => $lastName,
            'email'          => $email,
            'contact_number' => '',
            'password'       => null,
            'role'           => 'customer',
            'google_id'      => $googleId,
            'avatar'         => $avatar,
            'created_at'     => date('Y-m-d H:i:s')
        ];

        $users[] = $newUser;
        writeDataStore('users', $users);

        unset($newUser['password']);

        sendResponse([
            'success' => true,
            'message' => 'Google account registered and logged in!',
            'user'    => $newUser
        ], 201);
    }
}
?>
