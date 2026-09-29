<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Order Details API Endpoint
 * ============================================================================
 * Endpoint: GET /api/orders/get_order_details.php?id=BH-1008
 *
 * PURPOSE:
 * Retrieves comprehensive details for an individual order (including customer
 * delivery address, contact information, status, payment method, and all line items).
 * Used by the Order Details modal in the Admin Dashboard and the Order Tracking receipt.
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
// STEP 3: Validate Order ID
// ----------------------------------------------------------------------------
$id = trim($_GET['id'] ?? '');

if (empty($id)) {
    sendResponse([
        'success' => false,
        'message' => 'Order ID is required.'
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 4: Query Order & Items (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        $stmt = $pdo->prepare("
            SELECT o.id, o.user_id, o.customer_name, o.customer_contact, o.delivery_address,
                   o.payment_method, o.subtotal, o.delivery_fee, o.total, o.status, o.created_at,
                   DATE_FORMAT(o.created_at, '%M %d, %Y - %h:%i %p') as formatted_date
            FROM orders o
            WHERE o.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $order = $stmt->fetch();

        if (!$order) {
            sendResponse([
                'success' => false,
                'message' => 'Order not found.'
            ], 404);
        }

        // Cast numeric totals
        $order['subtotal']     = (float)$order['subtotal'];
        $order['delivery_fee'] = (float)$order['delivery_fee'];
        $order['total']        = (float)$order['total'];

        // Retrieve items from child table order_items
        $stmtItems = $pdo->prepare("
            SELECT id, product_id, product_name, price, quantity, customization 
            FROM order_items 
            WHERE order_id = :order_id
        ");
        $stmtItems->execute(['order_id' => $id]);
        $items = $stmtItems->fetchAll();

        foreach ($items as &$item) {
            $item['price']    = (float)$item['price'];
            $item['quantity'] = (int)$item['quantity'];

            if (!empty($item['customization'])) {
                $item['customization'] = is_string($item['customization']) 
                    ? json_decode($item['customization'], true) 
                    : $item['customization'];
            }
        }

        $order['items'] = $items;

        sendResponse([
            'success' => true,
            'order'   => $order
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
    $orders = readDataStore('orders');

    foreach ($orders as $o) {
        if ($o['id'] === $id) {
            sendResponse([
                'success' => true,
                'order'   => $o
            ], 200);
        }
    }

    sendResponse([
        'success' => false,
        'message' => 'Order not found.'
    ], 404);
}
?>
