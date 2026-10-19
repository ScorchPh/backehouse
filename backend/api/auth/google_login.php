<?php
// Google OAuth sign-in and account registration

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$data      = getRequestBody();
$email     = strtolower(trim($data['email'] ?? ''));
$googleId  = trim($data['google_id'] ?? $data['sub'] ?? $data['id'] ?? '');
$name      = trim($data['name'] ?? '');
$firstName = trim($data['first_name'] ?? $data['given_name'] ?? '');
$lastName  = trim($data['last_name'] ?? $data['family_name'] ?? '');
$avatar    = trim($data['avatar'] ?? $data['picture'] ?? 'https://lh3.googleusercontent.com/a/default-user=s96-c');

if (empty($email)) {
    sendResponse(['success' => false, 'message' => 'Google email is required.'], 400);
}

if (empty($googleId)) {
    // Generate deterministic fallback identifier if sub/google_id wasn't delivered
    $googleId = 'google_' . substr(hash('sha256', $email), 0, 24);
}

// Split full name if separate names not provided
if (empty($firstName)) {
    $nameParts = explode(' ', $name, 2);
    $firstName = !empty($nameParts[0]) ? $nameParts[0] : 'Google';
    $lastName  = !empty($nameParts[1]) ? $nameParts[1] : 'User';
}

$baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $email)[0])) ?: 'google_user';

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

// Self-healing schema migration: ensure google_id and other optional columns exist
try {
    $colStmt = $pdo->query("SHOW COLUMNS FROM `users`");
    $columns = $colStmt ? $colStmt->fetchAll(PDO::FETCH_COLUMN) : [];

    if (!in_array('google_id', $columns)) {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `google_id` VARCHAR(100) NULL UNIQUE AFTER `role`");
        $columns[] = 'google_id';
    }

    if (!in_array('avatar', $columns)) {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `avatar` VARCHAR(500) NULL AFTER `google_id`");
        $columns[] = 'avatar';
    }
} catch (Throwable $e) {
    // Continue gracefully if user lacks ALTER permission or column already exists
}

try {
    // Verify whether google_id column is present in the table
    $hasGoogleIdCol = false;
    try {
        $checkCol = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'google_id'");
        $hasGoogleIdCol = $checkCol && $checkCol->rowCount() > 0;
    } catch (Throwable $t) {
        $hasGoogleIdCol = false;
    }

    // Check if user already exists by email or google_id
    if ($hasGoogleIdCol) {
        $stmt = $pdo->prepare("
            SELECT * FROM users 
            WHERE email = :email OR (google_id IS NOT NULL AND google_id = :google_id)
            LIMIT 1
        ");
        $stmt->execute(['email' => $email, 'google_id' => $googleId]);
    } else {
        $stmt = $pdo->prepare("
            SELECT * FROM users 
            WHERE email = :email
            LIMIT 1
        ");
        $stmt->execute(['email' => $email]);
    }

    $existing = $stmt->fetch();

    if ($existing) {
        // Prepare dynamic update query depending on available columns
        $updateFields = [];
        $updateParams = ['id' => $existing['id']];

        if ($hasGoogleIdCol) {
            $updateFields[] = "google_id = COALESCE(google_id, :google_id)";
            $updateParams['google_id'] = $googleId;
        }

        if (array_key_exists('avatar', $existing)) {
            $updateFields[] = "avatar = COALESCE(:avatar, avatar)";
            $updateParams['avatar'] = $avatar;
        }

        if (array_key_exists('first_name', $existing) && empty($existing['first_name'])) {
            $updateFields[] = "first_name = :first_name";
            $updateParams['first_name'] = $firstName;
        }

        if (array_key_exists('last_name', $existing) && empty($existing['last_name'])) {
            $updateFields[] = "last_name = :last_name";
            $updateParams['last_name'] = $lastName;
        }

        if (!empty($updateFields)) {
            $updateSql = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = :id";
            $update = $pdo->prepare($updateSql);
            $update->execute($updateParams);
        }

        $existing['avatar'] = !empty($existing['avatar']) ? $existing['avatar'] : $avatar;
        if (empty($existing['first_name'])) $existing['first_name'] = $firstName;
        if (empty($existing['last_name'])) $existing['last_name'] = $lastName;
        if ($hasGoogleIdCol) $existing['google_id'] = $googleId;

        // Never expose hashed password in client session
        unset($existing['password']);

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

        // Build insert query respecting table schema
        $insertCols = ['username', 'first_name', 'last_name', 'email', 'password', 'role'];
        $insertVals = [':username', ':first_name', ':last_name', ':email', ':password', ':role'];
        $insertParams = [
            'username'   => $username,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'email'      => $email,
            'password'   => $randomPassword,
            'role'       => 'customer',
        ];

        // Check if optional columns exist
        $availableCols = [];
        try {
            $cStmt = $pdo->query("SHOW COLUMNS FROM `users`");
            $availableCols = $cStmt ? $cStmt->fetchAll(PDO::FETCH_COLUMN) : [];
        } catch (Throwable $t) {}

        if (in_array('google_id', $availableCols)) {
            $insertCols[] = 'google_id';
            $insertVals[] = ':google_id';
            $insertParams['google_id'] = $googleId;
        }

        if (in_array('avatar', $availableCols)) {
            $insertCols[] = 'avatar';
            $insertVals[] = ':avatar';
            $insertParams['avatar'] = $avatar;
        }

        if (in_array('contact_number', $availableCols)) {
            $insertCols[] = 'contact_number';
            $insertVals[] = "''";
        }

        if (in_array('default_barangay', $availableCols)) {
            $insertCols[] = 'default_barangay';
            $insertVals[] = "'Poblacion'";
        }

        if (in_array('default_city', $availableCols)) {
            $insertCols[] = 'default_city';
            $insertVals[] = "'Cordova'";
        }

        if (in_array('default_province', $availableCols)) {
            $insertCols[] = 'default_province';
            $insertVals[] = "'Cebu'";
        }

        if (in_array('default_lat', $availableCols)) {
            $insertCols[] = 'default_lat';
            $insertVals[] = "10.2540";
        }

        if (in_array('default_lng', $availableCols)) {
            $insertCols[] = 'default_lng';
            $insertVals[] = "123.9490";
        }

        $sql = "INSERT INTO users (" . implode(', ', $insertCols) . ") VALUES (" . implode(', ', $insertVals) . ")";
        $insert = $pdo->prepare($sql);
        $insert->execute($insertParams);

        $newId = (int)$pdo->lastInsertId();

        // Fetch freshly created user record
        $fetchNew = $pdo->prepare("SELECT * FROM users WHERE id = :id LIMIT 1");
        $fetchNew->execute(['id' => $newId]);
        $newUser = $fetchNew->fetch();
        if ($newUser) {
            unset($newUser['password']);
        } else {
            $newUser = [
                'id'         => $newId,
                'username'   => $username,
                'first_name' => $firstName,
                'last_name'  => $lastName,
                'email'      => $email,
                'role'       => 'customer',
                'avatar'     => $avatar,
                'google_id'  => $googleId
            ];
        }

        sendResponse([
            'success' => true,
            'message' => 'Google account registered and logged in successfully!',
            'user'    => $newUser
        ], 201);
    }

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
