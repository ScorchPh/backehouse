<?php
/**
 * ============================================================================
 * BAKE HOUSE - Create Product API Endpoint (Admin / Staff)
 * Endpoint: POST /api/products/create_product.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$data = getRequestBody();

$name = trim($data['name'] ?? '');
$description = trim($data['description'] ?? '');
$category = trim($data['category'] ?? 'Cake');
$price = (float)($data['price'] ?? 0.0);
$image = trim($data['image'] ?? 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500');
$stock = (int)($data['stock'] ?? 20);
$status = trim($data['status'] ?? 'Available');
$bestseller = !empty($data['bestseller']) ? 1 : 0;

if (empty($name) || $price <= 0) {
    sendResponse(['success' => false, 'message' => 'Product name and a valid price are required.'], 400);
}

$pdo = getDBConnection();

if ($pdo) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO products (name, description, category, price, image, stock, status, bestseller)
            VALUES (:name, :description, :category, :price, :image, :stock, :status, :bestseller)
        ");
        $stmt->execute([
            'name' => $name,
            'description' => $description,
            'category' => $category,
            'price' => $price,
            'image' => $image,
            'stock' => $stock,
            'status' => $status,
            'bestseller' => $bestseller
        ]);
        $newId = (int)$pdo->lastInsertId();
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $products = readDataStore('products');
    $newId = count($products) > 0 ? max(array_column($products, 'id')) + 1 : 1;
    $newProduct = [
        'id' => $newId,
        'name' => $name,
        'description' => $description,
        'category' => $category,
        'price' => $price,
        'image' => $image,
        'stock' => $stock,
        'status' => $status,
        'bestseller' => (bool)$bestseller,
        'created_at' => date('Y-m-d H:i:s')
    ];
    $products[] = $newProduct;
    writeDataStore('products', $products);
}

sendResponse([
    'success' => true,
    'message' => "Product '{$name}' created successfully!",
    'product' => [
        'id' => $newId,
        'name' => $name,
        'description' => $description,
        'category' => $category,
        'price' => $price,
        'image' => $image,
        'stock' => $stock,
        'status' => $status,
        'bestseller' => (bool)$bestseller
    ]
], 201);
?>
