<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Products Catalog API Endpoint
 * ============================================================================
 * Endpoint: GET /api/products/get_products.php
 * Query Parameters:
 *   - ?category=Cake    -> Filter by product category (Cake, Pastry, Bread, All)
 *   - ?search=choco     -> Keyword search matching product name or description
 *   - ?bestseller=1     -> Filter featured bestseller items (1 or 0)
 *
 * PURPOSE:
 * Serves the product catalog to the customer store page, product showcase,
 * and admin inventory table. Includes dual-engine persistence (MySQL / JSON).
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// STEP 1: Load Database Configuration & Helpers
// ----------------------------------------------------------------------------
require_once __DIR__ . '/../../config/db.php';


// ----------------------------------------------------------------------------
// STEP 2: Enforce HTTP Method Verification
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use GET.'
    ], 405);
}


// ----------------------------------------------------------------------------
// STEP 3: Parse and Sanitize Query Parameters
// ----------------------------------------------------------------------------
$category   = trim($_GET['category'] ?? 'All');
$search     = trim($_GET['search'] ?? '');
$bestseller = isset($_GET['bestseller']) ? (int)$_GET['bestseller'] : null;


// ----------------------------------------------------------------------------
// STEP 4: Fetch Products (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        $sql = "
            SELECT id, name, description, category, price, image, stock, status, bestseller, created_at 
            FROM products 
            WHERE 1=1
        ";
        $params = [];

        // Category filter (ignore if 'All')
        if (!empty($category) && strcasecmp($category, 'All') !== 0) {
            $sql .= " AND category = :category";
            $params['category'] = $category;
        }

        // Search filter matching name or description
        if (!empty($search)) {
            $sql .= " AND (name LIKE :search OR description LIKE :search)";
            $params['search'] = "%{$search}%";
        }

        // Bestseller boolean filter
        if ($bestseller !== null) {
            $sql .= " AND bestseller = :bestseller";
            $params['bestseller'] = $bestseller;
        }

        $sql .= " ORDER BY id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // Type-cast numeric fields so frontend receives accurate JavaScript numbers
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
        ], 200);

    } catch (PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ], 500);
    }

} else {
    // ------------------------------------------------------------------------
    // CASE B: Offline / Fallback Mode (Using JSON file store)
    // ------------------------------------------------------------------------
    $products = readDataStore('products');

    // Filter array based on requested query parameters
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

    sendResponse([
        'success'  => true,
        'count'    => count($filtered),
        'products' => array_values($filtered)
    ], 200);
}
?>
