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
        // Ensure google_id column exists on cloud database
        try {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `google_id` VARCHAR(100) NULL UNIQUE");
        } catch (Exception $e) {}

        // Introspect available columns in users table
        $userCols = [];
        try {
            $userCols = $pdo->query("DESCRIBE `users`")->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) {}

        $hasGoogleId = in_array('google_id', $userCols);
        $selectFields = ['id', 'username', 'first_name', 'last_name', 'email', 'contact_number', 'role'];
        foreach (['avatar', 'google_id', 'default_street', 'default_barangay', 'default_city', 'default_province', 'default_landmark', 'default_lat', 'default_lng', 'address'] as $f) {
            if (in_array($f, $userCols)) {
                $selectFields[] = $f;
            }
        }
        $fieldsStr = implode(', ', $selectFields);

        $whereClause = $hasGoogleId 
            ? "WHERE email = :email OR (google_id IS NOT NULL AND google_id = :google_id)"
            : "WHERE email = :email";

        $stmt = $pdo->prepare("SELECT {$fieldsStr} FROM users {$whereClause} LIMIT 1");
        $queryParams = ['email' => $email];
        if ($hasGoogleId) {
            $queryParams['google_id'] = $googleId;
        }
        $stmt->execute($queryParams);
        $existing = $stmt->fetch();

        if ($existing) {
            // Existing user: update available fields
            $updateSets = [];
            $updateParams = ['id' => $existing['id']];
            if ($hasGoogleId) {
                $updateSets[] = "google_id = COALESCE(google_id, :google_id)";
                $updateParams['google_id'] = $googleId;
            }
            if (in_array('avatar', $userCols)) {
                $updateSets[] = "avatar = COALESCE(:avatar, avatar)";
                $updateParams['avatar'] = $avatar;
            }
            if (in_array('first_name', $userCols)) {
                $updateSets[] = "first_name = CASE WHEN (first_name IS NULL OR first_name = '') THEN :first_name ELSE first_name END";
                $updateParams['first_name'] = $firstName;
            }
            if (in_array('last_name', $userCols)) {
                $updateSets[] = "last_name = CASE WHEN (last_name IS NULL OR last_name = '') THEN :last_name ELSE last_name END";
                $updateParams['last_name'] = $lastName;
            }
            if (!empty($updateSets)) {
                $updateSql = "UPDATE users SET " . implode(', ', $updateSets) . " WHERE id = :id";
                $update = $pdo->prepare($updateSql);
                $update->execute($updateParams);
            }

            $existing['avatar'] = $avatar ?: ($existing['avatar'] ?? '');
            if (empty($existing['first_name'])) $existing['first_name'] = $firstName;
            if (empty($existing['last_name'])) $existing['last_name'] = $lastName;

            // Also keep users.json in sync
            try {
                $fileUsers = readDataStore('users');
                $updatedUsers = false;
                foreach ($fileUsers as &$fu) {
                    if ((isset($fu['email']) && strtolower($fu['email']) === $email) || (isset($fu['id']) && $fu['id'] == $existing['id'])) {
                        $fu['google_id'] = $googleId;
                        if (!empty($avatar)) $fu['avatar'] = $avatar;
                        $updatedUsers = true;
                        break;
                    }
                }
                if ($updatedUsers) writeDataStore('users', $fileUsers);
            } catch (Exception $e) {}

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

            $randomPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);
            $insertCols = ['username', 'first_name', 'last_name', 'email', 'role'];
            $insertVals = [':username', ':first_name', ':last_name', ':email', "'customer'"];
            $insertParams = [
                'username'   => $username,
                'first_name' => $firstName,
                'last_name'  => $lastName,
                'email'      => $email
            ];

            if (in_array('password', $userCols)) {
                $insertCols[] = 'password';
                $insertVals[] = ':password';
                $insertParams['password'] = $randomPassword;
            }

            if (in_array('contact_number', $userCols)) {
                $insertCols[] = 'contact_number';
                $insertVals[] = ':contact_number';
                $insertParams['contact_number'] = '';
            }

            if ($hasGoogleId) {
                $insertCols[] = 'google_id';
                $insertVals[] = ':google_id';
                $insertParams['google_id'] = $googleId;
            }
            if (in_array('avatar', $userCols)) {
                $insertCols[] = 'avatar';
                $insertVals[] = ':avatar';
                $insertParams['avatar'] = $avatar;
            }
            if (in_array('default_city', $userCols)) {
                $insertCols[] = 'default_city';
                $insertVals[] = "'Cordova'";
            }
            if (in_array('default_province', $userCols)) {
                $insertCols[] = 'default_province';
                $insertVals[] = "'Cebu'";
            }

            $insertSql = "INSERT INTO users (" . implode(', ', $insertCols) . ") VALUES (" . implode(', ', $insertVals) . ")";
            $insert = $pdo->prepare($insertSql);
            $insert->execute($insertParams);

            $newId = (int)$pdo->lastInsertId();

            $newUser = [
                'id'               => $newId,
                'username'         => $username,
                'first_name'       => $firstName,
                'last_name'        => $lastName,
                'email'            => $email,
                'contact_number'   => '',
                'role'             => 'customer',
                'avatar'           => $avatar,
                'google_id'        => $googleId,
                'default_street'   => '',
                'default_barangay' => 'Poblacion',
                'default_city'     => 'Cordova',
                'default_province' => 'Cebu',
                'default_landmark' => '',
                'default_lat'      => 10.2540,
                'default_lng'      => 123.9490
            ];

            // Keep users.json in sync
            try {
                $fileUsers = readDataStore('users');
                $fileUsers[] = $newUser;
                writeDataStore('users', $fileUsers);
            } catch (Exception $e) {}

            sendResponse([
                'success' => true,
                'message' => 'Google account registered and logged in successfully!',
                'user'    => $newUser
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
