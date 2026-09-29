<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Single Product API Endpoint
 * ============================================================================
 * Endpoint: GET /api/products/get_product.php?id=X
 *
 * PURPOSE:
 * Fetches full details for a single product by its numeric ID. Used when
 * clicking a product card for the Quick View modal or Edit Product form.
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
// STEP 3: Validate and Sanitize Product ID
// ----------------------------------------------------------------------------
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    sendResponse([
        'success' => false,
        'message' => 'A valid positive Product ID is required.'
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 4: Query Database (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        $stmt = $pdo->prepare("
            SELECT id, name, description, category, price, image, stock, status, bestseller, created_at 
            FROM products 
            WHERE id = :id 
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $product = $stmt->fetch();

        if (!$product) {
            sendResponse([
                'success' => false,
                'message' => 'Product not found.'
            ], 404);
        }

        // Cast numeric fields for frontend compatibility
        $product['id']         = (int)$product['id'];
        $product['price']      = (float)$product['price'];
        $product['stock']      = (int)$product['stock'];
        $product['bestseller'] = (bool)$product['bestseller'];

        sendResponse([
            'success' => true,
            'product' => $product
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
    $found = null;

    foreach ($products as $p) {
        if ((int)$p['id'] === $id) {
            $found = $p;
            break;
        }
    }

    if (!$found) {
        sendResponse([
            'success' => false,
            'message' => 'Product not found.'
        ], 404);
    }

    sendResponse([
        'success' => true,
        'product' => $found
    ], 200);
}
?>
