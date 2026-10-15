<?php
// Update order status with inventory replenishment on cancellation

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST or PUT.'], 405);
}

$data = getRequestBody();

$id     = trim($data['id'] ?? ($data['order_id'] ?? ''));
$status = trim($data['status'] ?? '');
$reason = trim($data['reason'] ?? ($data['cancellation_reason'] ?? ''));

if (empty($id) || empty($status)) {
    sendResponse(['success' => false, 'message' => 'Both order ID and status are required.'], 400);
}

$validStatuses = ['Pending', 'Preparing', 'For Delivery', 'Completed', 'Cancelled', 'Denied'];
$matchedStatus = null;
foreach ($validStatuses as $vs) {
    if (strcasecmp($vs, $status) === 0) {
        $matchedStatus = $vs;
        break;
    }
}

if (!$matchedStatus) {
    sendResponse([
        'success' => false,
        'message' => "Invalid status '{$status}'. Allowed: " . implode(', ', $validStatuses)
    ], 400);
}

$status = $matchedStatus;

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    $pdo->beginTransaction();

    $stmtCheck = $pdo->prepare("SELECT id, status FROM orders WHERE id = :id LIMIT 1 FOR UPDATE");
    $stmtCheck->execute(['id' => $id]);
    $existing = $stmtCheck->fetch();

    if (!$existing) {
        $pdo->rollBack();
        sendResponse(['success' => false, 'message' => 'Order not found.'], 404);
    }

    $prevStatus = $existing['status'];

    // Update order status
    if (!empty($reason)) {
        $stmtUpdate = $pdo->prepare("UPDATE orders SET status = :status, cancellation_reason = :reason WHERE id = :id");
        $stmtUpdate->execute(['status' => $status, 'reason' => $reason, 'id' => $id]);
    } else {
        $stmtUpdate = $pdo->prepare("UPDATE orders SET status = :status WHERE id = :id");
        $stmtUpdate->execute(['status' => $status, 'id' => $id]);
    }

    // Replenish stock if order is cancelled or denied
    if (in_array($status, ['Denied', 'Cancelled']) && !in_array($prevStatus, ['Denied', 'Cancelled', 'Completed'])) {
        $stmtItems = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = :id");
        $stmtItems->execute(['id' => $id]);
        $items = $stmtItems->fetchAll();

        $stmtRestock = $pdo->prepare("
            UPDATE products 
            SET stock = stock + :qty,
                status = CASE 
                    WHEN (stock + :qty1) <= 0 THEN 'Out of Stock' 
                    WHEN (stock + :qty2) <= 5 THEN 'Low Stock' 
                    ELSE 'Available' 
                END
            WHERE id = :id
        ");

        foreach ($items as $item) {
            if (!empty($item['product_id'])) {
                $stmtRestock->execute([
                    'qty'  => (int)$item['quantity'],
                    'qty1' => (int)$item['quantity'],
                    'qty2' => (int)$item['quantity'],
                    'id'   => (int)$item['product_id']
                ]);
            }
        }
    }

    $pdo->commit();

    sendResponse([
        'success'  => true,
        'message'  => "Order {$id} status updated to '{$status}'." . (!empty($reason) ? " Reason: {$reason}" : ""),
        'order_id' => $id,
        'status'   => $status,
        'reason'   => $reason
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
?>
