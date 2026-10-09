<?php
// handles updating customer profile and their default delivery address

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';

// only allow POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use POST.'
    ], 405);
}

// get json payload or regular post form data
$payload = getRequestBody();
if (empty($payload) && !empty($_POST)) {
    $payload = $_POST;
}

if (empty($payload) || !is_array($payload)) {
    sendResponse([
        'success' => false,
        'message' => 'Invalid or empty profile data provided.'
    ], 400);
}

// find user by id or username
$userId = isset($payload['id']) ? (int)$payload['id'] : 0;
if ($userId <= 0 && !empty($payload['username'])) {
    $users = readDataStore('users');
    foreach ($users as $u) {
        if ($u['username'] === $payload['username']) {
            $userId = (int)$u['id'];
            break;
        }
    }
}

if ($userId <= 0) {
    sendResponse([
        'success' => false,
        'message' => 'User ID is required to update profile details.'
    ], 400);
}

// clean and trim input fields
$firstName = isset($payload['first_name']) ? trim((string)$payload['first_name']) : null;
$lastName  = isset($payload['last_name']) ? trim((string)$payload['last_name']) : null;
$email     = isset($payload['email']) ? strtolower(trim((string)$payload['email'])) : null;
$contact   = isset($payload['contact_number']) ? trim((string)$payload['contact_number']) : null;
$street    = isset($payload['default_street']) ? trim((string)$payload['default_street']) : null;
$barangay  = isset($payload['default_barangay']) ? trim((string)$payload['default_barangay']) : null;
$city      = isset($payload['default_city']) ? trim((string)$payload['default_city']) : null;
$province  = isset($payload['default_province']) ? trim((string)$payload['default_province']) : null;
$landmark  = isset($payload['default_landmark']) ? trim((string)$payload['default_landmark']) : null;
$lat       = isset($payload['default_lat']) && is_numeric($payload['default_lat']) ? (float)$payload['default_lat'] : null;
$lng       = isset($payload['default_lng']) && is_numeric($payload['default_lng']) ? (float)$payload['default_lng'] : null;

// combine address parts into one full address string
$addressParts = array_filter([$street, $barangay, $city, $province]);
$compositeAddress = !empty($addressParts) ? implode(', ', $addressParts) : (isset($payload['address']) ? trim((string)$payload['address']) : '');

// update users.json file first
$users = readDataStore('users');
$found = false;
$updatedUser = null;

for ($i = 0; $i < count($users); $i++) {
    if ((int)$users[$i]['id'] === $userId) {
        if ($firstName !== null) $users[$i]['first_name'] = $firstName;
        if ($lastName !== null)  $users[$i]['last_name']  = $lastName;
        if ($email !== null)     $users[$i]['email']      = $email;
        if ($contact !== null)   $users[$i]['contact_number'] = $contact;
        if ($street !== null)    $users[$i]['default_street'] = $street;
        if ($barangay !== null)  $users[$i]['default_barangay'] = $barangay;
        if ($city !== null)      $users[$i]['default_city'] = $city;
        if ($province !== null)  $users[$i]['default_province'] = $province;
        if ($landmark !== null)  $users[$i]['default_landmark'] = $landmark;
        if ($lat !== null)       $users[$i]['default_lat'] = $lat;
        if ($lng !== null)       $users[$i]['default_lng'] = $lng;
        if ($compositeAddress !== '') $users[$i]['address'] = $compositeAddress;

        $updatedUser = $users[$i];
        // don't send back the hashed password
        unset($updatedUser['password']);
        $found = true;
        break;
    }
}

// also sync to mysql if connected
try {
    $pdo = getDBConnection();
    if ($pdo) {
        // make sure new columns exist in table so it won't crash
        $columnsToEnsure = [
            'default_street'   => 'VARCHAR(255) NULL',
            'default_barangay' => 'VARCHAR(100) NULL',
            'default_city'     => 'VARCHAR(100) NULL',
            'default_province' => 'VARCHAR(100) NULL',
            'default_landmark' => 'VARCHAR(255) NULL',
            'default_lat'      => 'DECIMAL(10, 7) NULL',
            'default_lng'      => 'DECIMAL(10, 7) NULL',
            'address'          => 'TEXT NULL'
        ];

        foreach ($columnsToEnsure as $col => $definition) {
            try {
                $pdo->exec("ALTER TABLE `users` ADD COLUMN `{$col}` {$definition};");
            } catch (Exception $ignored) {
                // column already exists, safe to ignore
            }
        }

        // update user row in database
        $updateSql = "
            UPDATE `users` SET 
                `first_name` = COALESCE(:first_name, `first_name`),
                `last_name` = COALESCE(:last_name, `last_name`),
                `email` = COALESCE(:email, `email`),
                `contact_number` = COALESCE(:contact, `contact_number`),
                `default_street` = COALESCE(:street, `default_street`),
                `default_barangay` = COALESCE(:barangay, `default_barangay`),
                `default_city` = COALESCE(:city, `default_city`),
                `default_province` = COALESCE(:province, `default_province`),
                `default_landmark` = COALESCE(:landmark, `default_landmark`),
                `default_lat` = COALESCE(:lat, `default_lat`),
                `default_lng` = COALESCE(:lng, `default_lng`),
                `address` = COALESCE(:address, `address`)
            WHERE `id` = :id
        ";
        $stmt = $pdo->prepare($updateSql);
        $stmt->execute([
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'email'      => $email,
            'contact'    => $contact,
            'street'     => $street,
            'barangay'   => $barangay,
            'city'       => $city,
            'province'   => $province,
            'landmark'   => $landmark,
            'lat'        => $lat,
            'lng'        => $lng,
            'address'    => $compositeAddress ?: null,
            'id'         => $userId
        ]);

        // if user was in mysql but not yet in json, sync it
        if (!$found) {
            $selectStmt = $pdo->prepare("SELECT id, username, first_name, last_name, email, contact_number, role, avatar, created_at, default_street, default_barangay, default_city, default_province, default_landmark, default_lat, default_lng, address FROM users WHERE id = :id LIMIT 1");
            $selectStmt->execute(['id' => $userId]);
            $sqlUser = $selectStmt->fetch();
            if ($sqlUser) {
                $updatedUser = $sqlUser;
                $users[] = $sqlUser;
                $found = true;
            }
        }
    }
} catch (Exception $e) {
    // if db fails, continue with json file
    error_log("db update notice: " . $e->getMessage());
}

if (!$found) {
    sendResponse([
        'success' => false,
        'message' => 'User account not found.'
    ], 404);
}

// save updated list to users.json
writeDataStore('users', $users);

// send back success response
sendResponse([
    'success' => true,
    'message' => 'Profile details and default delivery address updated successfully!',
    'user'    => $updatedUser
], 200);
