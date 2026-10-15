<?php
// Google OAuth sign-in and account registration

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$data      = getRequestBody();
$email     = strtolower(trim($data['email'] ?? ''));
$googleId  = trim($data['google_id'] ?? $data['sub'] ?? 'google_' . time());
$name      = trim($data['name'] ?? '');
$firstName = trim($data['first_name'] ?? $data['given_name'] ?? '');
$lastName  = trim($data['last_name'] ?? $data['family_name'] ?? '');
$avatar    = trim($data['avatar'] ?? $data['picture'] ?? 'https://lh3.googleusercontent.com/a/default-user=s96-c');

if (empty($email)) {
    sendResponse(['success' => false, 'message' => 'Google email is required.'], 400);
}

// Split full name if separate names not provided
if (empty($firstName)) {
    $nameParts = explode(' ', $name, 2);
    $firstName = $nameParts[0] ?? 'Google';
    $lastName  = $nameParts[1] ?? 'User';
}

$baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $email)[0])) ?: 'google_user';

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    // Check if user already exists by email or google_id
    $stmt = $pdo->prepare("
        SELECT id, username, first_name, last_name, email, contact_number, role, avatar, google_id,
               default_street, default_barangay, default_city, default_province, default_landmark, default_lat, default_lng, address
        FROM users 
        WHERE email = :email OR (google_id IS NOT NULL AND google_id = :google_id)
        LIMIT 1
    ");
    $stmt->execute(['email' => $email, 'google_id' => $googleId]);
    $existing = $stmt->fetch();

    if ($existing) {
        // Update user's avatar or google_id if missing
        $update = $pdo->prepare("
            UPDATE users 
            SET google_id = COALESCE(google_id, :google_id),
                avatar = COALESCE(:avatar, avatar),
                first_name = CASE WHEN (first_name IS NULL OR first_name = '') THEN :first_name ELSE first_name END,
                last_name = CASE WHEN (last_name IS NULL OR last_name = '') THEN :last_name ELSE last_name END
            WHERE id = :id
        ");
        $update->execute([
            'google_id'  => $googleId,
            'avatar'     => $avatar,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'id'         => $existing['id']
        ]);

        $existing['avatar'] = $avatar ?: ($existing['avatar'] ?? '');
        if (empty($existing['first_name'])) $existing['first_name'] = $firstName;
        if (empty($existing['last_name'])) $existing['last_name'] = $lastName;

        sendResponse([
            'success' => true,
            'message' => 'Google sign-in successful! Welcome back, ' . $existing['first_name'],
            'user'    => $existing
        ]);

    } else {
        // Generate unique username
        $username = $baseUsername;
        $counter  = 1;
        while (true) {
            $check = $pdo->prepare("SELECT id FROM users WHERE username = :username LIMIT 1");
            $check->execute(['username' => $username]);
            if (!$check->fetch()) break;
            $username = $baseUsername . $counter++;
        }

        $randomPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);

        $insert = $pdo->prepare("
            INSERT INTO users (
                username, first_name, last_name, email, password, contact_number, role, avatar, google_id,
                default_street, default_barangay, default_city, default_province, default_landmark, default_lat, default_lng
            ) VALUES (
                :username, :first_name, :last_name, :email, :password, '', 'customer', :avatar, :google_id,
                '', 'Poblacion', 'Cordova', 'Cebu', '', 10.2540, 123.9490
            )
        ");
        $insert->execute([
            'username'   => $username,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'email'      => $email,
            'password'   => $randomPassword,
            'avatar'     => $avatar,
            'google_id'  => $googleId
        ]);

        $newId = (int)$pdo->lastInsertId();

        sendResponse([
            'success' => true,
            'message' => 'Google account registered and logged in successfully!',
            'user'    => [
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
            ]
        ], 201);
    }

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
