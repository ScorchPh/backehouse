<?php
// Confirm Batch Expired / Discard Endpoint
//
// Purpose:
// Confirms that a specific batch of a product has reached its expiration date and marks it 'Expired'.
// Deducts the batch's remaining quantity from the product's total inventory stock.
// Automatically rolls over the product's earliest expiration date to the NEXT active batch.

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

$data = getRequestBody();
if (empty($data) && !empty($_POST)) {
    $data = $_POST;
}

$batchId = isset($data['batch_id']) ? (int)$data['batch_id'] : 0;
if ($batchId <= 0) {
    sendResponse(['success' => false, 'message' => 'Valid batch ID is required.'], 400);
}

try {
    $pdo->beginTransaction();

    // 1. Fetch batch information
    $stmt = $pdo->prepare("
        SELECT b.*, p.name AS product_name, p.stock AS current_product_stock
        FROM product_batches b
        JOIN products p ON p.id = b.product_id
        WHERE b.id = :id
    ");
    $stmt->execute(['id' => $batchId]);
    $batch = $stmt->fetch();

    if (!$batch) {
        $pdo->rollBack();
        sendResponse(['success' => false, 'message' => 'Batch not found.'], 404);
    }

    $discardQty = (int)$batch['quantity'];
    $productId = (int)$batch['product_id'];

    // 2. Mark batch as Expired with quantity 0
    $updBatch = $pdo->prepare("
        UPDATE product_batches
        SET status = 'Expired',
            quantity = 0
        WHERE id = :id
    ");
    $updBatch->execute(['id' => $batchId]);

    // 3. Deduct from product stock
    $newStock = max(0, (int)$batch['current_product_stock'] - $discardQty);

    // 4. Find the NEXT earliest active batch expiration date
    $nextStmt = $pdo->prepare("
        SELECT MIN(expiration_date) AS next_expiry
        FROM product_batches
        WHERE product_id = :product_id AND quantity > 0 AND status = 'Active'
    ");
    $nextStmt->execute(['product_id' => $productId]);
    $nextExpiry = $nextStmt->fetchColumn() ?: null;

    $updProduct = $pdo->prepare("
        UPDATE products
        SET stock = :stock,
            expiration_date = :next_expiry,
            status = CASE 
                WHEN :stock <= 0 THEN 'Out of Stock' 
                WHEN :stock <= 5 THEN 'Low Stock' 
                ELSE 'Available' 
            END
        WHERE id = :id
    ");
    $updProduct->execute([
        'stock'       => $newStock,
        'next_expiry' => $nextExpiry,
        'id'          => $productId
    ]);

    $pdo->commit();

    sendResponse([
        'success'      => true,
        'message'      => "Batch '{$batch['batch_number']}' ({$discardQty} expired units) removed from stock. Product {$batch['product_name']} stock updated to {$newStock}.",
        'discarded_qty'=> $discardQty,
        'new_stock'    => $newStock,
        'next_expiry'  => $nextExpiry
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse(['success' => false, 'message' => 'Failed to discard batch: ' . $e->getMessage()], 500);
}
?>
