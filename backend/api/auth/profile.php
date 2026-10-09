<?php
/**
 * ============================================================================
 * BAKE HOUSE - User Profile API Endpoint
 * ============================================================================
 * Endpoint: GET /api/auth/profile.php?id=X or ?email=user@example.com
 *
 * PURPOSE:
 * Retrieves user profile information for displaying account settings, avatar,
 * and contact information in the header/profile page.
 * Never returns sensitive password hashes.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// STEP 1: Load Database Configuration & Helpers
// ----------------------------------------------------------------------------
require_once __DIR__ . '/../../config/db.php';


// ----------------------------------------------------------------------------
// STEP 2: Enforce HTTP Method Verification
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use GET.'
    ], 405);
}


// ----------------------------------------------------------------------------
// STEP 3: Parse and Validate Identifier (ID or Email)
// ----------------------------------------------------------------------------
$id    = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$email = strtolower(trim($_GET['email'] ?? ''));

if ($id <= 0 && empty($email)) {
    sendResponse([
        'success' => false,
        'message' => 'User ID or Email is required.'
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 4: Query User Record (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        $fields = "id, username, first_name, last_name, email, contact_number, role, avatar, created_at, default_street, default_barangay, default_city, default_province, default_landmark, default_lat, default_lng, address";
        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT {$fields} FROM users WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $id]);
        } else {
            $stmt = $pdo->prepare("SELECT {$fields} FROM users WHERE LOWER(email) = :email LIMIT 1");
            $stmt->execute(['email' => $email]);
        }

        $user = $stmt->fetch();

        if (!$user) {
            sendResponse([
                'success' => false,
                'message' => 'User not found.'
            ], 404);
        }

        sendResponse([
            'success' => true,
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
    $users = readDataStore('users');

    foreach ($users as $u) {
        if (($id > 0 && (int)$u['id'] === $id) || (!empty($email) && strtolower($u['email']) === $email)) {
            unset($u['password']);
            sendResponse([
                'success' => true,
                'user'    => $u
            ], 200);
        }
    }

    sendResponse([
        'success' => false,
        'message' => 'User not found.'
    ], 404);
}
?>
