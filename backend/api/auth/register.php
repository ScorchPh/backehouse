<?php
/**
 * ============================================================================
 * BAKE HOUSE - User Registration API Endpoint
 * Endpoint: POST /api/auth/register.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$data = getRequestBody();

$firstName = trim($data['first_name'] ?? '');
$lastName = trim($data['last_name'] ?? '');
$email = strtolower(trim($data['email'] ?? ''));
$contactNumber = trim($data['contact_number'] ?? '');
$password = trim($data['password'] ?? '');
$confirmPassword = trim($data['confirm_password'] ?? '');

if (empty($firstName) || empty($lastName) || empty($email) || empty($password)) {
    sendResponse(['success' => false, 'message' => 'Please fill in all required fields.'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(['success' => false, 'message' => 'Please enter a valid email address.'], 400);
}

if (!empty($confirmPassword) && $password !== $confirmPassword) {
    sendResponse(['success' => false, 'message' => 'Passwords do not match.'], 400);
}

$pdo = getDBConnection();
$baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $email)[0])) ?: 'user';
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

if ($pdo) {
    try {
        $stmtCheck = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $stmtCheck->execute(['email' => $email]);
        if ($stmtCheck->fetch()) {
            sendResponse(['success' => false, 'message' => 'An account with this email already exists.'], 409);
        }

        $username = $baseUsername;
        $counter = 1;
        while (true) {
            $stmtUserCheck = $pdo->prepare("SELECT id FROM users WHERE username = :username LIMIT 1");
            $stmtUserCheck->execute(['username' => $username]);
            if (!$stmtUserCheck->fetch()) break;
            $username = $baseUsername . $counter++;
        }

        $stmtInsert = $pdo->prepare("
            INSERT INTO users (username, first_name, last_name, email, contact_number, password, role)
            VALUES (:username, :first_name, :last_name, :email, :contact_number, :password, 'customer')
        ");
        $stmtInsert->execute([
            'username' => $username,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'contact_number' => $contactNumber,
            'password' => $hashedPassword
        ]);

        $newUserId = (int)$pdo->lastInsertId();

        sendResponse([
            'success' => true,
            'message' => 'Account successfully created! You can now log in.',
            'user' => [
                'id' => $newUserId,
                'username' => $username,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'contact_number' => $contactNumber,
                'role' => 'customer'
            ]
        ], 201);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Registration error: ' . $e->getMessage()], 500);
    }
} else {
    $users = readDataStore('users');
    foreach ($users as $u) {
        if (strtolower($u['email']) === $email) {
            sendResponse(['success' => false, 'message' => 'An account with this email already exists.'], 409);
        }
    }

    $username = $baseUsername;
    $counter = 1;
    $existingUsernames = array_column($users, 'username');
    while (in_array($username, $existingUsernames)) {
        $username = $baseUsername . $counter++;
    }

    $newId = count($users) > 0 ? max(array_column($users, 'id')) + 1 : 1;
    $newUser = [
        'id' => $newId,
        'username' => $username,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'contact_number' => $contactNumber,
        'password' => $hashedPassword,
        'role' => 'customer',
        'avatar' => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
        'created_at' => date('Y-m-d H:i:s')
    ];

    $users[] = $newUser;
    writeDataStore('users', $users);

    unset($newUser['password']);
    sendResponse([
        'success' => true,
        'message' => 'Account successfully created! You can now log in.',
        'user' => $newUser
    ], 201);
}
?>
