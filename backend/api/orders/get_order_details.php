<?php
// Get order details by order id

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$id = trim($_GET['id'] ?? '');
if (empty($id)) {
    sendResponse(['success' => false, 'message' => 'Order ID is required'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    $stmt = $pdo->prepare("
        SELECT o.id, o.user_id, o.customer_name, o.customer_contact, 
               COALESCE(o.fulfillment_type, 'Delivery') as fulfillment_type,
               o.delivery_address, o.delivery_coordinates, o.distance_km, o.estimated_delivery_time,
               o.scheduled_date, o.scheduled_time, COALESCE(o.is_scheduled, 0) as is_scheduled,
               o.payment_method, o.subtotal, o.delivery_fee, o.total, o.status, 
               COALESCE(o.cancellation_reason, '') as cancellation_reason,
               COALESCE(o.cashier_name, '') as cashier_name,
               o.cash_tendered, o.change_amount, o.discount_amount, o.discount_type, o.ref_number,
               o.created_at,
               DATE_FORMAT(o.created_at, '%M %d, %Y - %h:%i %p') as formatted_date
        FROM orders o
        WHERE o.id = :id 
        LIMIT 1
    ");
    $stmt->execute(['id' => $id]);
    $order = $stmt->fetch();

    if (!$order) {
        sendResponse(['success' => false, 'message' => 'Order not found'], 404);
    }

    $order['subtotal']        = (float)$order['subtotal'];
    $order['delivery_fee']    = (float)$order['delivery_fee'];
    $order['total']           = (float)$order['total'];
    $order['discount_amount'] = (float)($order['discount_amount'] ?? 0);
    $order['cash_tendered']   = isset($order['cash_tendered']) && $order['cash_tendered'] !== null ? (float)$order['cash_tendered'] : null;
    $order['change_amount']   = isset($order['change_amount']) && $order['change_amount'] !== null ? (float)$order['change_amount'] : null;

    if (!empty($order['delivery_coordinates'])) {
        $order['delivery_coordinates'] = is_string($order['delivery_coordinates']) 
            ? json_decode($order['delivery_coordinates'], true) 
            : $order['delivery_coordinates'];
    } else {
        $order['delivery_coordinates'] = null;
    }
    $order['distance_km'] = isset($order['distance_km']) && $order['distance_km'] !== null ? (float)$order['distance_km'] : null;
    $order['is_scheduled'] = !empty($order['is_scheduled']) || !empty($order['scheduled_date']);

    // Fetch line items
    $stmtItems = $pdo->prepare("
        SELECT oi.id, oi.product_id, oi.product_name, oi.price, oi.quantity, oi.customization,
               p.image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = :order_id
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
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
