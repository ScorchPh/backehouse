<?php
// Confirm Expired Product Endpoint
//
// Purpose:
// Allows store administrators to confirm that a batch/product has passed its expiration date.
// Sets available stock to 0, updates product status to 'Expired', and records disposal.

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$data = getRequestBody();
$id   = isset($data['id']) ? (int)$data['id'] : 0;

if ($id <= 0) {
    sendResponse(['success' => false, 'message' => 'Valid Product ID is required.'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

// Ensure expiration_date column exists
try {
    $colStmt = $pdo->query("SHOW COLUMNS FROM `products` LIKE 'expiration_date'");
    if ($colStmt && $colStmt->rowCount() === 0) {
        $pdo->exec("ALTER TABLE `products` ADD COLUMN `expiration_date` DATE NULL AFTER `stock`");
    }
} catch (Throwable $e) {}

try {
    // Check if product exists
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => $id]);
    $product = $stmt->fetch();

    if (!$product) {
        sendResponse(['success' => false, 'message' => 'Product not found.'], 404);
    }

    $discardedUnits = (int)$product['stock'];
    $name = $product['name'];

    // Update product: deduct all expired units from stock, mark status as 'Expired'
    $updateStmt = $pdo->prepare("
        UPDATE products 
        SET stock = 0,
            status = 'Expired'
        WHERE id = :id
    ");
    $updateStmt->execute(['id' => $id]);

    sendResponse([
        'success'         => true,
        'message'         => "Expired status confirmed for '{$name}'. {$discardedUnits} unit(s) removed from active inventory.",
        'discarded_units' => $discardedUnits,
        'product'         => [
            'id'              => $id,
            'name'            => $name,
            'stock'           => 0,
            'status'          => 'Expired',
            'expiration_date' => $product['expiration_date']
        ]
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
