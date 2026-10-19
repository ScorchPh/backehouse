<?php
// Get Batches for a Product Endpoint
//
// Purpose:
// Returns active batches for a given product or all batches, sorted by expiration date (FEFO).

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
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

$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : 0;

try {
    if ($productId > 0) {
        $stmt = $pdo->prepare("
            SELECT b.*, p.name AS product_name 
            FROM product_batches b
            JOIN products p ON p.id = b.product_id
            WHERE b.product_id = :product_id AND b.quantity > 0 AND b.status != 'Depleted'
            ORDER BY b.expiration_date ASC, b.id ASC
        ");
        $stmt->execute(['product_id' => $productId]);
        $batches = $stmt->fetchAll();
    } else {
        $stmt = $pdo->query("
            SELECT b.*, p.name AS product_name 
            FROM product_batches b
            JOIN products p ON p.id = b.product_id
            WHERE b.quantity > 0 AND b.status != 'Depleted'
            ORDER BY b.expiration_date ASC, b.id ASC
        ");
        $batches = $stmt->fetchAll();
    }

    foreach ($batches as &$b) {
        $b['id'] = (int)$b['id'];
        $b['product_id'] = (int)$b['product_id'];
        $b['quantity'] = (int)$b['quantity'];
        $b['initial_quantity'] = (int)$b['initial_quantity'];
    }

    sendResponse([
        'success' => true,
        'count'   => count($batches),
        'batches' => $batches
    ]);
} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
