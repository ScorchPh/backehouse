<?php
// Update customer profile and default delivery address

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$payload = getRequestBody();
if (empty($payload) && !empty($_POST)) {
    $payload = $_POST;
}

if (empty($payload) || !is_array($payload)) {
    sendResponse(['success' => false, 'message' => 'Invalid or empty profile data'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

$userId = isset($payload['id']) ? (int)$payload['id'] : 0;

// Lookup user id by username if id not provided
if ($userId <= 0 && !empty($payload['username'])) {
    $checkUser = $pdo->prepare("SELECT id FROM users WHERE username = :u LIMIT 1");
    $checkUser->execute(['u' => $payload['username']]);
    $userId = (int)$checkUser->fetchColumn();
}

if ($userId <= 0) {
    sendResponse(['success' => false, 'message' => 'User ID is required to update profile details.'], 400);
}

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

// Format full address
$addressParts = array_filter([$street, $barangay, $city, $province]);
$compositeAddress = !empty($addressParts) ? implode(', ', $addressParts) : (isset($payload['address']) ? trim((string)$payload['address']) : '');

try {
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

    // Fetch updated user
    $selectStmt = $pdo->prepare("
        SELECT id, username, first_name, last_name, email, contact_number, role, avatar, created_at,
               default_street, default_barangay, default_city, default_province, default_landmark, default_lat, default_lng, address
        FROM users 
        WHERE id = :id 
        LIMIT 1
    ");
    $selectStmt->execute(['id' => $userId]);
    $updatedUser = $selectStmt->fetch();

    if (!$updatedUser) {
        sendResponse(['success' => false, 'message' => 'User account not found.'], 404);
    }

    sendResponse([
        'success' => true,
        'message' => 'Profile details updated successfully!',
        'user'    => $updatedUser
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
