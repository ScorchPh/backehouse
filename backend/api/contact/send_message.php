<?php
/**
 * ============================================================================
 * BAKE HOUSE - Send Contact Message API Endpoint
 * Endpoint: POST /api/contact/send_message.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$data = getRequestBody();

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');

if (empty($name) || empty($email) || empty($subject) || empty($message)) {
    sendResponse(['success' => false, 'message' => 'Please fill in all fields.'], 400);
}

$pdo = getDBConnection();

if ($pdo) {
    try {
        $stmt = $pdo->prepare("INSERT INTO messages (name, email, subject, message) VALUES (:name, :email, :subject, :message)");
        $stmt->execute(['name' => $name, 'email' => $email, 'subject' => $subject, 'message' => $message]);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $messages = readDataStore('messages');
    $newId = count($messages) > 0 ? max(array_column($messages, 'id')) + 1 : 1;
    $messages[] = [
        'id' => $newId,
        'name' => $name,
        'email' => $email,
        'subject' => $subject,
        'message' => $message,
        'created_at' => date('Y-m-d H:i:s'),
        'formatted_date' => date('F d, Y - h:i A')
    ];
    writeDataStore('messages', $messages);
}

sendResponse([
    'success' => true,
    'message' => 'Thank you for reaching out! We have received your message and will respond shortly.'
], 201);
?>
