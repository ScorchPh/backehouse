<?php
// Get Products Catalog Endpoint
//
// Purpose:
// Returns the bakery product catalog to the customer store page, product showcase, and admin inventory list.
// Supports query parameters for category filtering, keyword searching, and bestseller flags.

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

// Read and sanitize query parameters
$category   = trim($_GET['category'] ?? 'All');
$search     = trim($_GET['search'] ?? '');
$bestseller = isset($_GET['bestseller']) ? (int)$_GET['bestseller'] : null;

try {
    // Dynamic query building with WHERE 1=1 so we can cleanly append conditional AND clauses
    $sql = "
        SELECT id, name, description, category, price, image, stock, status, bestseller, created_at 
        FROM products 
        WHERE 1=1
    ";
    $params = [];

    // Filter by category unless 'All' is selected
    if (!empty($category) && strcasecmp($category, 'All') !== 0) {
        $sql .= " AND category = :category";
        $params['category'] = $category;
    }

    // Keyword search matching either product name or description
    if (!empty($search)) {
        $sql .= " AND (name LIKE :search OR description LIKE :search)";
        $params['search'] = "%{$search}%";
    }

    // Filter for featured bestseller items
    if ($bestseller !== null) {
        $sql .= " AND bestseller = :bestseller";
        $params['bestseller'] = $bestseller;
    }

    $sql .= " ORDER BY id ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();

    // Cast database strings to proper data types so frontend receives accurate JavaScript numbers and booleans
    foreach ($products as &$p) {
        $p['id']         = (int)$p['id'];
        $p['price']      = (float)$p['price'];
        $p['stock']      = (int)$p['stock'];
        $p['bestseller'] = (bool)$p['bestseller'];
    }

    sendResponse([
        'success'  => true,
        'count'    => count($products),
        'products' => $products
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
