<?php
// Customer Registration Endpoint
//
// Purpose:
// Creates new customer user accounts.
// Checks for existing emails, auto-generates a clean unique username,
// hashes the password securely with Bcrypt, and stores the user in the MySQL database.

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$data = getRequestBody();

$firstName     = trim($data['first_name'] ?? '');
$lastName      = trim($data['last_name'] ?? '');
$email         = strtolower(trim($data['email'] ?? ''));
$contactNumber = trim($data['contact_number'] ?? '');
$password      = (string)($data['password'] ?? '');

// Validation
if (empty($firstName) || empty($lastName) || empty($email) || empty($password)) {
    sendResponse(['success' => false, 'message' => 'First name, last name, email, and password are required.'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(['success' => false, 'message' => 'Please provide a valid email address.'], 400);
}

if (strlen($password) < 4) {
    sendResponse(['success' => false, 'message' => 'Password must be at least 4 characters.'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

// Generate base username from the email prefix or first name
$baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $email)[0]));
if (empty($baseUsername)) {
    $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $firstName));
}

try {
    // Check if an account already exists with this email
    $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = :email LIMIT 1");
    $stmtCheck->execute(['email' => $email]);
    if ($stmtCheck->fetch()) {
        sendResponse(['success' => false, 'message' => 'An account with this email already exists.'], 409);
    }

    // Ensure username is unique by checking and incrementing a counter if taken
    $username = $baseUsername;
    $counter  = 1;
    while (true) {
        $stmtUserCheck = $pdo->prepare("SELECT id FROM users WHERE username = :username LIMIT 1");
        $stmtUserCheck->execute(['username' => $username]);
        if (!$stmtUserCheck->fetch()) {
            break;
        }
        $username = $baseUsername . $counter++;
    }

    // Hash password with Bcrypt
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $defaultAvatar  = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';

    $stmtInsert = $pdo->prepare("
        INSERT INTO users (username, first_name, last_name, email, contact_number, password, role, avatar)
        VALUES (:username, :first_name, :last_name, :email, :contact_number, :password, 'customer', :avatar)
    ");

    $stmtInsert->execute([
        'username'       => $username,
        'first_name'     => $firstName,
        'last_name'      => $lastName,
        'email'          => $email,
        'contact_number' => $contactNumber,
        'password'       => $hashedPassword,
        'avatar'         => $defaultAvatar
    ]);

    $newId = (int)$pdo->lastInsertId();

    sendResponse([
        'success' => true,
        'message' => 'Account successfully created! You can now log in.',
        'user'    => [
            'id'             => $newId,
            'username'       => $username,
            'first_name'     => $firstName,
            'last_name'      => $lastName,
            'email'          => $email,
            'contact_number' => $contactNumber,
            'avatar'         => $defaultAvatar,
            'role'           => 'customer'
        ]
    ], 201);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Registration error: ' . $e->getMessage()], 500);
}
?>
