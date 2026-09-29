<?php
/**
 * ============================================================================
 * BAKE HOUSE - Customers List API Endpoint
 * ============================================================================
 * Endpoint: GET /api/auth/customers.php
 * Role: Admin / Staff management
 *
 * PURPOSE:
 * Returns the directory of all registered user accounts for the admin
 * customer directory and staff lookup tables. Strips password hashes.
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
// STEP 3: Retrieve Users (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        $stmt = $pdo->query("
            SELECT id, username, first_name, last_name, email, contact_number, role, avatar, created_at 
            FROM users 
            ORDER BY created_at DESC
        ");
        $customers = $stmt->fetchAll();

        sendResponse([
            'success'   => true,
            'count'     => count($customers),
            'customers' => $customers
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

    // Securely remove password hash from every customer record
    $sanitized = array_map(function($u) {
        unset($u['password']);
        return $u;
    }, $users);

    sendResponse([
        'success'   => true,
        'count'     => count($sanitized),
        'customers' => $sanitized
    ], 200);
}
?>
