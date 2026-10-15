<?php
// Receive customer contact inquiry and save to database

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$data    = getRequestBody();
$name    = trim($data['name'] ?? '');
$email   = trim($data['email'] ?? '');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');
$userId  = !empty($data['user_id']) ? intval($data['user_id']) : null;

if (empty($name) || empty($email) || empty($subject) || empty($message)) {
    sendResponse(['success' => false, 'message' => 'Please fill in all required fields (name, email, subject, message).'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO messages (user_id, name, email, subject, message) 
        VALUES (:user_id, :name, :email, :subject, :message)
    ");
    $stmt->execute([
        'user_id' => $userId,
        'name'    => $name,
        'email'   => $email,
        'subject' => $subject,
        'message' => $message
    ]);

    sendResponse([
        'success' => true,
        'message' => 'Thank you for reaching out! We have received your message.'
    ], 201);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
