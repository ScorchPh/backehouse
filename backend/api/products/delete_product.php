<?php
// Delete product by id

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST or DELETE.'], 405);
}

$data = getRequestBody();
$id = isset($data['id']) ? (int)$data['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);

if ($id <= 0) {
    sendResponse(['success' => false, 'message' => 'Valid Product ID is required'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() === 0) {
        sendResponse(['success' => false, 'message' => 'Product not found or already deleted'], 404);
    }

    sendResponse([
        'success' => true,
        'message' => 'Product deleted successfully.'
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
