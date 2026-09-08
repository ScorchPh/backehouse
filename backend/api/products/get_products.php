<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Products Catalog API Endpoint
 * Endpoint: GET /api/products/get_products.php
 * Query Params: ?category=Cake&search=choco&bestseller=1
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$category = trim($_GET['category'] ?? 'All');
$search = trim($_GET['search'] ?? '');
$bestseller = isset($_GET['bestseller']) ? (int)$_GET['bestseller'] : null;

$pdo = getDBConnection();

if ($pdo) {
    try {
        $sql = "SELECT id, name, description, category, price, image, stock, status, bestseller, created_at FROM products WHERE 1=1";
        $params = [];

        if (!empty($category) && strcasecmp($category, 'All') !== 0) {
            $sql .= " AND category = :category";
            $params['category'] = $category;
        }

        if (!empty($search)) {
            $sql .= " AND (name LIKE :search OR description LIKE :search)";
            $params['search'] = "%{$search}%";
        }

        if ($bestseller !== null) {
            $sql .= " AND bestseller = :bestseller";
            $params['bestseller'] = $bestseller;
        }

        $sql .= " ORDER BY id ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        foreach ($products as &$p) {
            $p['id'] = (int)$p['id'];
            $p['price'] = (float)$p['price'];
            $p['stock'] = (int)$p['stock'];
            $p['bestseller'] = (bool)$p['bestseller'];
        }

        sendResponse(['success' => true, 'count' => count($products), 'products' => $products], 200);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $products = readDataStore('products');

    // Filter
    $filtered = array_filter($products, function($p) use ($category, $search, $bestseller) {
        if (!empty($category) && strcasecmp($category, 'All') !== 0 && strcasecmp($p['category'], $category) !== 0) {
            return false;
        }
        if (!empty($search)) {
            $q = strtolower($search);
            if (strpos(strtolower($p['name']), $q) === false && strpos(strtolower($p['description']), $q) === false) {
                return false;
            }
        }
        if ($bestseller !== null && (bool)$p['bestseller'] !== (bool)$bestseller) {
            return false;
        }
        return true;
    });

    sendResponse(['success' => true, 'count' => count($filtered), 'products' => array_values($filtered)], 200);
}
?>
