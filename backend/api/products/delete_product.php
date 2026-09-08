<?php
/**
 * ============================================================================
 * BAKE HOUSE - Delete Product API Endpoint (Admin)
 * Endpoint: POST or DELETE /api/products/delete_product.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST or DELETE.'], 405);
}

$data = getRequestBody();
$id = (int)($data['id'] ?? $_GET['id'] ?? 0);

if ($id <= 0) {
    sendResponse(['success' => false, 'message' => 'Product ID is required.'], 400);
}

$pdo = getDBConnection();

if ($pdo) {
    try {
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
        $stmt->execute(['id' => $id]);
        if ($stmt->rowCount() === 0) sendResponse(['success' => false, 'message' => 'Product not found.'], 404);
        sendResponse(['success' => true, 'message' => 'Product deleted successfully.'], 200);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $products = readDataStore('products');
    $initialCount = count($products);
    $filtered = array_filter($products, fn($p) => (int)$p['id'] !== $id);

    if (count($filtered) === $initialCount) {
        sendResponse(['success' => false, 'message' => 'Product not found.'], 404);
    }

    writeDataStore('products', array_values($filtered));
    sendResponse(['success' => true, 'message' => 'Product deleted successfully.'], 200);
}
?>
