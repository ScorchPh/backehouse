<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Orders API Endpoint
 * ============================================================================
 * Endpoint: GET /api/orders/get_orders.php
 * Query Parameters:
 *   - ?user_id=3         -> Filters orders belonging to a specific customer account
 *   - ?status=Pending    -> Filters by status (Pending, Preparing, For Delivery, Completed, Cancelled)
 *   - ?search=BH-1008    -> Keyword search matching Order ID, Customer Name, or Phone
 *
 * PURPOSE:
 * Fetches order records for the Admin/Staff order management table or customer
 * "My Orders" history. Retrieves line items for each order and calculates item summaries.
 * Supports dual-engine storage (MySQL / TiDB Cloud with fallback to JSON).
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// STEP 1: Load Database Configuration & Helpers
// ----------------------------------------------------------------------------
require_once __DIR__ . '/../../config/db.php';


// ----------------------------------------------------------------------------
// STEP 2: Enforce HTTP Method Verification
// ----------------------------------------------------------------------------
// Only allow GET requests for data retrieval.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use GET.'
    ], 405);
}


// ----------------------------------------------------------------------------
// STEP 3: Parse and Sanitize Query Parameters
// ----------------------------------------------------------------------------
// URL parameters come through the $_GET superglobal
$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$status = trim($_GET['status'] ?? '');
$search = trim($_GET['search'] ?? '');


// ----------------------------------------------------------------------------
// STEP 4: Query Orders from Database (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        // Build base SQL query. We use 'WHERE 1=1' as a clean SQL design pattern
        // allowing us to dynamically append 'AND' conditions below without syntax errors.
        $sql = "
            SELECT o.id, o.user_id, o.customer_name, o.customer_contact, o.delivery_address, 
                   o.payment_method, o.subtotal, o.delivery_fee, o.total, o.status, o.created_at,
                   DATE_FORMAT(o.created_at, '%M %d, %Y') as formatted_date
            FROM orders o
            WHERE 1=1
        ";
        $params = [];

        // Filter by user ID (if viewing personal order history as customer)
        if ($userId !== null && $userId > 0) {
            $sql .= " AND o.user_id = :user_id";
            $params['user_id'] = $userId;
        }

        // Filter by order status (e.g. 'Pending', 'Preparing', 'Completed')
        if (!empty($status) && strcasecmp($status, 'all') !== 0) {
            $sql .= " AND LOWER(o.status) = LOWER(:status)";
            $params['status'] = $status;
        }

        // Keyword search across Order ID, Customer Name, and Contact Number
        if (!empty($search)) {
            $sql .= " AND (o.id LIKE :search OR o.customer_name LIKE :search OR o.customer_contact LIKE :search)";
            $params['search'] = "%{$search}%";
        }

        // Newest orders first
        $sql .= " ORDER BY o.created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        // Prepared statement to fetch the items for each order
        $stmtItems = $pdo->prepare("
            SELECT id, product_name, price, quantity, customization 
            FROM order_items 
            WHERE order_id = :order_id
        ");

        // Loop through each order to attach its line items and sanitize numeric types
        foreach ($orders as &$order) {
            $order['subtotal']     = (float)$order['subtotal'];
            $order['delivery_fee'] = (float)$order['delivery_fee'];
            $order['total']        = (float)$order['total'];

            // Fetch corresponding items from order_items table
            $stmtItems->execute(['order_id' => $order['id']]);
            $items = $stmtItems->fetchAll();

            foreach ($items as &$item) {
                $item['price']    = (float)$item['price'];
                $item['quantity'] = (int)$item['quantity'];

                // Decode JSON customization if custom cake options were stored
                if (!empty($item['customization'])) {
                    $item['customization'] = is_string($item['customization']) 
                        ? json_decode($item['customization'], true) 
                        : $item['customization'];
                }
            }

            $order['items'] = $items;

            // Human-readable summary for tables (e.g. 'Chocolate Cake +2 more')
            $order['items_summary'] = count($items) > 0 
                ? $items[0]['product_name'] . (count($items) > 1 ? ' +' . (count($items) - 1) . ' more' : '') 
                : 'No items';
        }

        sendResponse([
            'success' => true,
            'count'   => count($orders),
            'orders'  => $orders
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

    // Filter using PHP array_filter
    $filtered = array_filter($orders, function($o) use ($userId, $status, $search) {
        if ($userId !== null && $userId > 0 && (!isset($o['user_id']) || (int)$o['user_id'] !== $userId)) {
            return false;
        }
        if (!empty($status) && strcasecmp($status, 'all') !== 0 && strcasecmp($o['status'], $status) !== 0) {
            return false;
        }
        if (!empty($search)) {
            $q = strtolower($search);
            if (strpos(strtolower($o['id']), $q) === false && strpos(strtolower($o['customer_name']), $q) === false) {
                return false;
            }
        }
        return true;
    });

    sendResponse([
        'success' => true,
        'count'   => count($filtered),
        'orders'  => array_values($filtered)
    ], 200);
}
?>
