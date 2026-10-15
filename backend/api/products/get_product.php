<?php
// Get single product details by id

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    sendResponse(['success' => false, 'message' => 'Valid Product ID is required'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    $stmt = $pdo->prepare("
        SELECT id, name, description, category, price, image, stock, status, bestseller, created_at 
        FROM products 
        WHERE id = :id 
        LIMIT 1
    ");
    $stmt->execute(['id' => $id]);
    $product = $stmt->fetch();

    if (!$product) {
        sendResponse(['success' => false, 'message' => 'Product not found'], 404);
    }

    $product['id']         = (int)$product['id'];
    $product['price']      = (float)$product['price'];
    $product['stock']      = (int)$product['stock'];
    $product['bestseller'] = (bool)$product['bestseller'];

    sendResponse([
        'success' => true,
        'product' => $product
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
