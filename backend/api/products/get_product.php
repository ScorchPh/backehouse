<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Single Product API Endpoint
 * Endpoint: GET /api/products/get_product.php?id=X
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    sendResponse(['success' => false, 'message' => 'Valid Product ID is required.'], 400);
}

$pdo = getDBConnection();

try {
    $stmt = $pdo->prepare("SELECT id, name, description, category, price, image, stock, status, bestseller, created_at FROM products WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => $id]);
    $product = $stmt->fetch();

    if (!$product) {
        sendResponse(['success' => false, 'message' => 'Product not found.'], 404);
    }

    $product['id'] = (int)$product['id'];
    $product['price'] = (float)$product['price'];
    $product['stock'] = (int)$product['stock'];
    $product['bestseller'] = (bool)$product['bestseller'];

    sendResponse(['success' => true, 'product' => $product], 200);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
