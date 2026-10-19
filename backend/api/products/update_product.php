<?php
// Update existing product details

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST or PUT.'], 405);
}

$data = getRequestBody();

$id = isset($data['id']) ? (int)$data['id'] : 0;
if ($id <= 0) {
    sendResponse(['success' => false, 'message' => 'Valid Product ID is required'], 400);
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
    $check = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
    $check->execute(['id' => $id]);
    $existing = $check->fetch();

    if (!$existing) {
        sendResponse(['success' => false, 'message' => 'Product not found'], 404);
    }

    $name        = isset($data['name']) ? trim($data['name']) : $existing['name'];
    $description = isset($data['description']) ? trim($data['description']) : $existing['description'];
    $category    = isset($data['category']) ? trim($data['category']) : $existing['category'];
    $price       = isset($data['price']) ? (float)$data['price'] : (float)$existing['price'];
    $image       = isset($data['image']) ? trim($data['image']) : $existing['image'];
    $stock       = isset($data['stock']) ? (int)$data['stock'] : (int)$existing['stock'];

    if (isset($data['status'])) {
        $status = trim($data['status']);
    } else {
        $status = $stock <= 0 ? 'Out of Stock' : ($stock <= 5 ? 'Low Stock' : 'Available');
    }

    $expirationDate = array_key_exists('expiration_date', $data)
        ? (!empty($data['expiration_date']) ? trim($data['expiration_date']) : null)
        : ($existing['expiration_date'] ?? null);

    $bestseller = isset($data['bestseller']) ? (!empty($data['bestseller']) ? 1 : 0) : $existing['bestseller'];

    $stmt = $pdo->prepare("
        UPDATE products 
        SET name = :name,
            description = :description,
            category = :category,
            price = :price,
            image = :image,
            stock = :stock,
            status = :status,
            expiration_date = :expiration_date,
            bestseller = :bestseller
        WHERE id = :id
    ");

    $stmt->execute([
        'name'            => $name,
        'description'     => $description,
        'category'        => $category,
        'price'           => $price,
        'image'           => $image,
        'stock'           => $stock,
        'status'          => $status,
        'expiration_date' => $expirationDate,
        'bestseller'      => $bestseller,
        'id'              => $id
    ]);

    sendResponse([
        'success' => true,
        'message' => "Product '{$name}' updated successfully!",
        'product' => [
            'id'              => $id,
            'name'            => $name,
            'description'     => $description,
            'category'        => $category,
            'price'           => $price,
            'image'           => $image,
            'stock'           => $stock,
            'status'          => $status,
            'expiration_date' => $expirationDate,
            'bestseller'      => (bool)$bestseller
        ]
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
