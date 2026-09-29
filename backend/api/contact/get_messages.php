<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Contact Inquiries API Endpoint
 * ============================================================================
 * Endpoint: GET /api/contact/get_messages.php
 * Role: Admin / Staff customer support
 *
 * PURPOSE:
 * Retrieves inquiries and feedback submitted through the customer Contact Us form.
 * Formats timestamps into human-readable strings (e.g. 'September 29, 2026 - 11:30 AM').
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
// STEP 3: Retrieve Messages (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        $stmt = $pdo->query("
            SELECT id, name, email, subject, message, created_at,
                   DATE_FORMAT(created_at, '%M %d, %Y - %h:%i %p') as formatted_date
            FROM messages 
            ORDER BY created_at DESC
        ");
        $messages = $stmt->fetchAll();

        sendResponse([
            'success'  => true,
            'count'    => count($messages),
            'messages' => $messages
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
    $messages = readDataStore('messages');

    sendResponse([
        'success'  => true,
        'count'    => count($messages),
        'messages' => $messages
    ], 200);
}
?>
