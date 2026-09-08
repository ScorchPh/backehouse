<?php
/**
 * ============================================================================
 * BAKE HOUSE - Update Product API Endpoint (Admin / Staff)
 * Endpoint: POST or PUT /api/products/update_product.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST or PUT.'], 405);
}

$data = getRequestBody();
$id = (int)($data['id'] ?? $_GET['id'] ?? 0);

if ($id <= 0) {
    sendResponse(['success' => false, 'message' => 'Product ID is required.'], 400);
}

$pdo = getDBConnection();

if ($pdo) {
    try {
        $stmtCheck = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
        $stmtCheck->execute(['id' => $id]);
        $current = $stmtCheck->fetch();

        if (!$current) {
            sendResponse(['success' => false, 'message' => 'Product not found.'], 404);
        }

        $name = isset($data['name']) ? trim($data['name']) : $current['name'];
        $description = isset($data['description']) ? trim($data['description']) : $current['description'];
        $category = isset($data['category']) ? trim($data['category']) : $current['category'];
        $price = isset($data['price']) ? (float)$data['price'] : (float)$current['price'];
        $image = isset($data['image']) ? trim($data['image']) : $current['image'];
        $stock = isset($data['stock']) ? (int)$data['stock'] : (int)$current['stock'];
        $status = isset($data['status']) ? trim($data['status']) : $current['status'];
        $bestseller = isset($data['bestseller']) ? ($data['bestseller'] ? 1 : 0) : (int)$current['bestseller'];

        if (!isset($data['status'])) {
            $status = $stock <= 0 ? 'Out of Stock' : ($stock <= 5 ? 'Low Stock' : 'Available');
        }

        $stmtUpdate = $pdo->prepare("
            UPDATE products 
            SET name = :name, description = :description, category = :category, 
                price = :price, image = :image, stock = :stock, status = :status, bestseller = :bestseller
            WHERE id = :id
        ");
        $stmtUpdate->execute([
            'name' => $name,
            'description' => $description,
            'category' => $category,
            'price' => $price,
            'image' => $image,
            'stock' => $stock,
            'status' => $status,
            'bestseller' => $bestseller,
            'id' => $id
        ]);

        sendResponse(['success' => true, 'message' => "Product '{$name}' updated successfully!"], 200);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $products = readDataStore('products');
    $found = false;
    foreach ($products as &$p) {
        if ((int)$p['id'] === $id) {
            $found = true;
            $p['name'] = isset($data['name']) ? trim($data['name']) : $p['name'];
            $p['description'] = isset($data['description']) ? trim($data['description']) : $p['description'];
            $p['category'] = isset($data['category']) ? trim($data['category']) : $p['category'];
            $p['price'] = isset($data['price']) ? (float)$data['price'] : (float)$p['price'];
            $p['image'] = isset($data['image']) ? trim($data['image']) : $p['image'];
            $p['stock'] = isset($data['stock']) ? (int)$data['stock'] : (int)$p['stock'];
            if (isset($data['status'])) {
                $p['status'] = trim($data['status']);
            } else {
                $p['status'] = $p['stock'] <= 0 ? 'Out of Stock' : ($p['stock'] <= 5 ? 'Low Stock' : 'Available');
            }
            if (isset($data['bestseller'])) {
                $p['bestseller'] = (bool)$data['bestseller'];
            }
            break;
        }
    }

    if (!$found) {
        sendResponse(['success' => false, 'message' => 'Product not found.'], 404);
    }

    writeDataStore('products', $products);
    sendResponse(['success' => true, 'message' => 'Product updated successfully!'], 200);
}
?>
