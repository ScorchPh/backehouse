<?php
/**
 * ============================================================================
 * BAKE HOUSE - Send Contact Message API Endpoint
 * ============================================================================
 * Endpoint: POST /api/contact/send_message.php
 * Accepts: JSON payload { name, email, subject, message }
 *
 * PURPOSE:
 * Receives messages sent from customers on the Contact page, validates fields,
 * and saves the inquiry to the database (MySQL/TiDB or fallback JSON).
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
// STEP 3: Receive and Validate Inquiry Inputs
// ----------------------------------------------------------------------------
$data    = getRequestBody();
$name    = trim($data['name'] ?? '');
$email   = trim($data['email'] ?? '');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');

if (empty($name) || empty($email) || empty($subject) || empty($message)) {
    sendResponse([
        'success' => false,
        'message' => 'Please fill in all required fields (name, email, subject, message).'
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 4: Store Message (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        $stmt = $pdo->prepare("
            INSERT INTO messages (name, email, subject, message) 
            VALUES (:name, :email, :subject, :message)
        ");
        $stmt->execute([
            'name'    => $name,
            'email'   => $email,
            'subject' => $subject,
            'message' => $message
        ]);

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
    $newId    = count($messages) > 0 ? max(array_column($messages, 'id')) + 1 : 1;

    $messages[] = [
        'id'             => $newId,
        'name'           => $name,
        'email'          => $email,
        'subject'        => $subject,
        'message'        => $message,
        'created_at'     => date('Y-m-d H:i:s'),
        'formatted_date' => date('F d, Y - h:i A')
    ];

    writeDataStore('messages', $messages);
}


// ----------------------------------------------------------------------------
// STEP 5: Return Confirmation Response
// ----------------------------------------------------------------------------
sendResponse([
    'success' => true,
    'message' => 'Thank you for reaching out! We have received your message and will respond shortly.'
], 201);
?>
