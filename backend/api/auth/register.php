<?php
/**
 * ============================================================================
 * BAKE HOUSE - User Registration API Endpoint
 * ============================================================================
 * Endpoint: POST /api/auth/register.php
 * Accepts: JSON payload { first_name, last_name, email, contact_number, password, confirm_password }
 *
 * PURPOSE:
 * Registers a new customer account. Performs email validation, password confirmation,
 * duplicate email checks, unique username generation from the email address, and
 * cryptographically hashes the password with Bcrypt (PASSWORD_BCRYPT).
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
// STEP 3: Receive and Sanitize Form Inputs
// ----------------------------------------------------------------------------
$data            = getRequestBody();
$firstName       = trim($data['first_name'] ?? '');
$lastName        = trim($data['last_name'] ?? '');
$email           = strtolower(trim($data['email'] ?? ''));
$contactNumber   = trim($data['contact_number'] ?? '');
$password        = trim($data['password'] ?? '');
$confirmPassword = trim($data['confirm_password'] ?? '');


// ----------------------------------------------------------------------------
// STEP 4: Input Validation
// ----------------------------------------------------------------------------
// Check mandatory fields
if (empty($firstName) || empty($lastName) || empty($email) || empty($password)) {
    sendResponse([
        'success' => false,
        'message' => 'Please fill in all required fields.'
    ], 400);
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse([
        'success' => false,
        'message' => 'Please enter a valid email address.'
    ], 400);
}

// Ensure password confirmation matches
if (!empty($confirmPassword) && $password !== $confirmPassword) {
    sendResponse([
        'success' => false,
        'message' => 'Passwords do not match.'
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 5: Hash Password & Generate Base Username
// ----------------------------------------------------------------------------
// Bcrypt hashing with random salt generated automatically by PHP
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

// Extract clean alphanumeric username from email prefix (e.g. 'john@gmail.com' -> 'john')
$baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $email)[0])) ?: 'user';


// ----------------------------------------------------------------------------
// STEP 6: Save User to Database (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        // Check for existing email to prevent duplicate accounts
        $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $stmtCheck->execute(['email' => $email]);

        if ($stmtCheck->fetch()) {
            sendResponse([
                'success' => false,
                'message' => 'An account with this email already exists.'
            ], 409); // 409 Conflict
        }

        // Generate a unique username if base is already taken (e.g. john, john1, john2)
        $username = $baseUsername;
        $counter  = 1;
        while (true) {
            $stmtUserCheck = $pdo->prepare("SELECT id FROM users WHERE username = :username LIMIT 1");
            $stmtUserCheck->execute(['username' => $username]);
            if (!$stmtUserCheck->fetch()) break;
            $username = $baseUsername . $counter++;
        }

        // Insert new customer record
        $stmtInsert = $pdo->prepare("
            INSERT INTO users (username, first_name, last_name, email, contact_number, password, role)
            VALUES (:username, :first_name, :last_name, :email, :contact_number, :password, 'customer')
        ");
        $stmtInsert->execute([
            'username'       => $username,
            'first_name'     => $firstName,
            'last_name'      => $lastName,
            'email'          => $email,
            'contact_number' => $contactNumber,
            'password'       => $hashedPassword
        ]);

        $newUserId = (int)$pdo->lastInsertId();

        sendResponse([
            'success' => true,
            'message' => 'Account successfully created! You can now log in.',
            'user'    => [
                'id'             => $newUserId,
                'username'       => $username,
                'first_name'     => $firstName,
                'last_name'      => $lastName,
                'email'          => $email,
                'contact_number' => $contactNumber,
                'role'           => 'customer'
            ]
        ], 201);

    } catch (PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Registration error: ' . $e->getMessage()
        ], 500);
    }

} else {
    // ------------------------------------------------------------------------
    // CASE B: Offline / Fallback Mode (Using JSON file store)
    // ------------------------------------------------------------------------
    $users = readDataStore('users');

    // Duplicate check
    foreach ($users as $u) {
        if (strtolower($u['email']) === $email) {
            sendResponse([
                'success' => false,
                'message' => 'An account with this email already exists.'
            ], 409);
        }
    }

    // Unique username generator
    $username          = $baseUsername;
    $counter           = 1;
    $existingUsernames = array_column($users, 'username');
    while (in_array($username, $existingUsernames)) {
        $username = $baseUsername . $counter++;
    }

    $newId   = count($users) > 0 ? max(array_column($users, 'id')) + 1 : 1;
    $newUser = [
        'id'             => $newId,
        'username'       => $username,
        'first_name'     => $firstName,
        'last_name'      => $lastName,
        'email'          => $email,
        'contact_number' => $contactNumber,
        'password'       => $hashedPassword,
        'role'           => 'customer',
        'avatar'         => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
        'created_at'     => date('Y-m-d H:i:s')
    ];

    $users[] = $newUser;
    writeDataStore('users', $users);

    // Strip password hash from response
    unset($newUser['password']);

    sendResponse([
        'success' => true,
        'message' => 'Account successfully created! You can now log in.',
        'user'    => $newUser
    ], 201);
}
?>
