<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Orders API Endpoint
 * Endpoint: GET /api/orders/get_orders.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$status = trim($_GET['status'] ?? '');
$search = trim($_GET['search'] ?? '');

$pdo = getDBConnection();

if ($pdo) {
    try {
        $sql = "
            SELECT o.id, o.user_id, o.customer_name, o.customer_contact, o.delivery_address, 
                   o.payment_method, o.subtotal, o.delivery_fee, o.total, o.status, o.created_at,
                   DATE_FORMAT(o.created_at, '%M %d, %Y') as formatted_date
            FROM orders o
            WHERE 1=1
        ";
        $params = [];

        if ($userId !== null && $userId > 0) {
            $sql .= " AND o.user_id = :user_id";
            $params['user_id'] = $userId;
        }

        if (!empty($status) && strcasecmp($status, 'all') !== 0) {
            $sql .= " AND LOWER(o.status) = LOWER(:status)";
            $params['status'] = $status;
        }

        if (!empty($search)) {
            $sql .= " AND (o.id LIKE :search OR o.customer_name LIKE :search OR o.customer_contact LIKE :search)";
            $params['search'] = "%{$search}%";
        }

        $sql .= " ORDER BY o.created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        $stmtItems = $pdo->prepare("SELECT id, product_name, price, quantity, customization FROM order_items WHERE order_id = :order_id");

        foreach ($orders as &$order) {
            $order['subtotal'] = (float)$order['subtotal'];
            $order['delivery_fee'] = (float)$order['delivery_fee'];
            $order['total'] = (float)$order['total'];

            $stmtItems->execute(['order_id' => $order['id']]);
            $items = $stmtItems->fetchAll();

            foreach ($items as &$item) {
                $item['price'] = (float)$item['price'];
                $item['quantity'] = (int)$item['quantity'];
                if (!empty($item['customization'])) {
                    $item['customization'] = json_decode($item['customization'], true);
                }
            }

            $order['items'] = $items;
            $order['items_summary'] = count($items) > 0 
                ? $items[0]['product_name'] . (count($items) > 1 ? ' +' . (count($items) - 1) . ' more' : '') 
                : 'No items';
        }

        sendResponse(['success' => true, 'count' => count($orders), 'orders' => $orders], 200);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $orders = readDataStore('orders');

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

    sendResponse(['success' => true, 'count' => count($filtered), 'orders' => array_values($filtered)], 200);
}
?>
