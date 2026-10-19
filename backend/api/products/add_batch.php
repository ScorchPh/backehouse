<?php
// Add Product Batch Endpoint
//
// Purpose:
// Logs a new production/baking batch for a product with quantity and expiration date.
// Automatically increments the product's overall stock and updates the product's earliest expiration date.

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

// Self-healing migration for product_batches table
try {
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS `product_batches` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `product_id` INT NOT NULL,
        `batch_number` VARCHAR(50) NOT NULL,
        `quantity` INT NOT NULL DEFAULT 0,
        `initial_quantity` INT NOT NULL DEFAULT 0,
        `expiration_date` DATE NOT NULL,
        `notes` VARCHAR(255) NULL,
        `status` ENUM('Active', 'Expired', 'Depleted') NOT NULL DEFAULT 'Active',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_product_expiry` (`product_id`, `expiration_date`),
        FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Throwable $e) {}

$data = getJsonPayload();
if (empty($data) && !empty($_POST)) {
    $data = $_POST;
}

$productId = isset($data['product_id']) ? (int)$data['product_id'] : 0;
$quantity = isset($data['quantity']) ? (int)$data['quantity'] : 0;
$expirationDate = trim($data['expiration_date'] ?? '');
$batchNumber = trim($data['batch_number'] ?? '');
$notes = trim($data['notes'] ?? '');

if ($productId <= 0 || $quantity <= 0 || empty($expirationDate)) {
    sendResponse(['success' => false, 'message' => 'Product ID, positive quantity, and expiration date are required.'], 400);
}

// Auto-generate batch number if none provided
if (empty($batchNumber)) {
    $batchNumber = 'B-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
}

try {
    $pdo->beginTransaction();

    // Verify product exists
    $chk = $pdo->prepare("SELECT id, name, stock FROM products WHERE id = :id");
    $chk->execute(['id' => $productId]);
    $product = $chk->fetch();

    if (!$product) {
        $pdo->rollBack();
        sendResponse(['success' => false, 'message' => 'Product not found.'], 404);
    }

    // 1. Insert new batch
    $stmtBatch = $pdo->prepare("
        INSERT INTO product_batches (product_id, batch_number, quantity, initial_quantity, expiration_date, notes, status)
        VALUES (:product_id, :batch_number, :quantity, :initial_quantity, :expiration_date, :notes, 'Active')
    ");
    $stmtBatch->execute([
        'product_id'       => $productId,
        'batch_number'     => $batchNumber,
        'quantity'         => $quantity,
        'initial_quantity' => $quantity,
        'expiration_date'  => $expirationDate,
        'notes'            => $notes ?: null
    ]);
    $batchId = (int)$pdo->lastInsertId();

    // 2. Increase product stock and re-evaluate status
    // 3. Find the earliest expiration date among all active batches with quantity > 0
    $earliestStmt = $pdo->prepare("
        SELECT MIN(expiration_date) AS earliest_expiry
        FROM product_batches
        WHERE product_id = :product_id AND quantity > 0 AND status = 'Active'
    ");
    $earliestStmt->execute(['product_id' => $productId]);
    $earliestRow = $earliestStmt->fetch();
    $earliestDate = $earliestRow['earliest_expiry'] ?? $expirationDate;

    // Recalculate total stock from active batches or increment
    $stockStmt = $pdo->prepare("
        SELECT COALESCE(SUM(quantity), 0) AS total_batch_stock
        FROM product_batches
        WHERE product_id = :product_id AND quantity > 0 AND status = 'Active'
    ");
    $stockStmt->execute(['product_id' => $productId]);
    $totalBatchStock = (int)$stockStmt->fetchColumn();

    $newStock = max((int)$product['stock'] + $quantity, $totalBatchStock);

    $updProduct = $pdo->prepare("
        UPDATE products
        SET stock = :stock,
            expiration_date = :earliest_date,
            status = CASE 
                WHEN :stock <= 0 THEN 'Out of Stock' 
                WHEN :stock <= 5 THEN 'Low Stock' 
                ELSE 'Available' 
            END
        WHERE id = :id
    ");
    $updProduct->execute([
        'stock'         => $newStock,
        'earliest_date' => $earliestDate,
        'id'            => $productId
    ]);

    $pdo->commit();

    sendResponse([
        'success'      => true,
        'message'      => "Batch '{$batchNumber}' ({$quantity} units) added successfully to {$product['name']}!",
        'batch_id'     => $batchId,
        'new_stock'    => $newStock,
        'earliest_exp' => $earliestDate
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse(['success' => false, 'message' => 'Failed to add batch: ' . $e->getMessage()], 500);
}
?>
