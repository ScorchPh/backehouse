<?php
// Get list of orders with line items

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$status = trim($_GET['status'] ?? '');
$search = trim($_GET['search'] ?? '');

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    $sql = "
        SELECT o.id, o.user_id, o.customer_name, o.customer_contact, 
               COALESCE(o.fulfillment_type, 'Delivery') as fulfillment_type,
               o.delivery_address, o.delivery_coordinates, o.distance_km, o.estimated_delivery_time,
               o.scheduled_date, o.scheduled_time, COALESCE(o.is_scheduled, 0) as is_scheduled,
               o.payment_method, o.subtotal, o.delivery_fee, o.total, o.status, 
               COALESCE(o.cancellation_reason, '') as cancellation_reason,
               o.created_at,
               DATE_FORMAT(o.created_at, '%M %d, %Y') as formatted_date
        FROM orders o
        WHERE 1=1
    ";
    $params = [];

    // Filter by customer user id
    if ($userId !== null && $userId > 0) {
        $sql .= " AND o.user_id = :user_id";
        $params['user_id'] = $userId;
    }

    // Filter by status
    if (!empty($status) && strcasecmp($status, 'all') !== 0) {
        $sql .= " AND LOWER(o.status) = LOWER(:status)";
        $params['status'] = $status;
    }

    // Keyword search across id, name, or phone
    if (!empty($search)) {
        $sql .= " AND (o.id LIKE :search OR o.customer_name LIKE :search OR o.customer_contact LIKE :search)";
        $params['search'] = "%{$search}%";
    }

    $sql .= " ORDER BY o.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    // Fetch order items in a batch
    if (!empty($orders)) {
        $orderIds = array_column($orders, 'id');
        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        
        $stmtItems = $pdo->prepare("
            SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity, oi.customization,
                   p.image
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id IN ($placeholders)
        ");
        $stmtItems->execute($orderIds);
        $allItems = $stmtItems->fetchAll();

        $itemsByOrderId = [];
        foreach ($allItems as $item) {
            $item['price'] = (float)$item['price'];
            $item['quantity'] = (int)$item['quantity'];
            if (!empty($item['customization'])) {
                $item['customization'] = is_string($item['customization']) 
                    ? json_decode($item['customization'], true) 
                    : $item['customization'];
            }
            $itemsByOrderId[$item['order_id']][] = $item;
        }

        foreach ($orders as &$order) {
            $order['subtotal']     = (float)$order['subtotal'];
            $order['delivery_fee'] = (float)$order['delivery_fee'];
            $order['total']        = (float)$order['total'];

            if (!empty($order['delivery_coordinates'])) {
                $order['delivery_coordinates'] = is_string($order['delivery_coordinates']) 
                    ? json_decode($order['delivery_coordinates'], true) 
                    : $order['delivery_coordinates'];
            } else {
                $order['delivery_coordinates'] = null;
            }
            $order['distance_km'] = isset($order['distance_km']) && $order['distance_km'] !== null ? (float)$order['distance_km'] : null;
            $order['is_scheduled'] = !empty($order['is_scheduled']) || !empty($order['scheduled_date']);

            $items = $itemsByOrderId[$order['id']] ?? [];
            $order['items'] = $items;
            $order['items_summary'] = count($items) > 0 
                ? $items[0]['product_name'] . (count($items) > 1 ? ' +' . (count($items) - 1) . ' more' : '') 
                : 'No items';
        }
    }

    sendResponse([
        'success' => true,
        'count'   => count($orders),
        'orders'  => $orders
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
