<?php
/**
 * ============================================================================
 * BAKE HOUSE - Update Order Status API Endpoint (Admin & Staff)
 * ============================================================================
 * Features:
 * 1. Updates order status across lifecycle:
 *    Pending -> Confirmed -> Preparing -> Ready for Pickup / For Delivery -> Completed.
 * 2. Deny / Cancel with Reason:
 *    Accepts 'Denied' or 'Cancelled' along with a mandatory or optional reason string.
 * 3. Inventory Stock Replenishment:
 *    When an order is Denied or Cancelled, automatically refunds reserved catalog stock!
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST or PUT.'], 405);
}

$data = getRequestBody();
$id = trim($data['id'] ?? $_GET['id'] ?? '');
$status = trim($data['status'] ?? '');
$reason = trim($data['reason'] ?? $data['denial_reason'] ?? $data['cancellation_reason'] ?? '');

$allowedStatuses = [
    'Pending',
    'Confirmed',
    'Preparing',
    'Ready for Pickup',
    'For Delivery',
    'Completed',
    'Cancelled',
    'Denied'
];

if (empty($id) || empty($status)) {
    sendResponse(['success' => false, 'message' => 'Order ID and status are required.'], 400);
}

if (!in_array($status, $allowedStatuses)) {
    sendResponse(['success' => false, 'message' => 'Invalid status. Allowed: ' . implode(', ', $allowedStatuses)], 400);
}

$pdo = getDBConnection();

if ($pdo) {
    try {
        // Fetch current order to check previous status and items for stock restoration
        $checkStmt = $pdo->prepare("SELECT * FROM orders WHERE id = :id");
        $checkStmt->execute(['id' => $id]);
        $currentOrder = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$currentOrder) {
            sendResponse(['success' => false, 'message' => 'Order not found.'], 404);
        }

        $prevStatus = $currentOrder['status'] ?? 'Pending';

        // Update order status and denial reason
        $stmt = $pdo->prepare("UPDATE orders SET status = :status WHERE id = :id");
        $stmt->execute(['status' => $status, 'id' => $id]);

        // If transitioning to Denied or Cancelled from an active status, replenish inventory stock
        if (in_array($status, ['Denied', 'Cancelled']) && !in_array($prevStatus, ['Denied', 'Cancelled', 'Completed'])) {
            $itemsStmt = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = :id");
            $itemsStmt->execute(['id' => $id]);
            $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($orderItems as $it) {
                if (!empty($it['product_id']) && (int)$it['product_id'] < 1000000) {
                    $stockStmt = $pdo->prepare("UPDATE products SET stock = stock + :qty WHERE id = :pid");
                    $stockStmt->execute([
                        'qty' => (int)$it['quantity'],
                        'pid' => (int)$it['product_id']
                    ]);
                }
            }
        }

        sendResponse([
            'success' => true,
            'message' => "Order {$id} status updated to '{$status}'." . (!empty($reason) ? " Reason: {$reason}" : ""),
            'order_id' => $id,
            'status' => $status,
            'reason' => $reason
        ], 200);
    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
    }
} else {
    $orders = readDataStore('orders');
    $found = false;
    $targetOrder = null;

    foreach ($orders as &$o) {
        if ($o['id'] === $id) {
            $prevStatus = $o['status'] ?? 'Pending';
            $o['status'] = $status;
            
            if (!empty($reason)) {
                $o['denial_reason'] = $reason;
                $o['cancellation_reason'] = $reason;
                $o['denied_at'] = date('Y-m-d H:i:s');
            }

            $targetOrder = $o;
            $found = true;

            // Replenish stock in products.json if denied/cancelled
            if (in_array($status, ['Denied', 'Cancelled']) && !in_array($prevStatus, ['Denied', 'Cancelled', 'Completed'])) {
                $products = readDataStore('products');
                $items = $o['items'] ?? [];

                foreach ($items as $item) {
                    $prodId = $item['product_id'] ?? $item['id'] ?? null;
                    $qty = (int)($item['quantity'] ?? 1);

                    if ($prodId && (int)$prodId < 1000000) {
                        foreach ($products as &$p) {
                            if ((int)$p['id'] === (int)$prodId) {
                                $p['stock'] = (int)($p['stock'] ?? 0) + $qty;
                                $p['status'] = $p['stock'] <= 0 ? 'Out of Stock' : ($p['stock'] <= 5 ? 'Low Stock' : 'Available');
                                break;
                            }
                        }
                    }
                }
                writeDataStore('products', $products);
            }

            break;
        }
    }

    if (!$found) {
        sendResponse(['success' => false, 'message' => 'Order not found.'], 404);
    }

    writeDataStore('orders', $orders);
    sendResponse([
        'success' => true,
        'message' => "Order {$id} status updated to '{$status}'." . (!empty($reason) ? " Reason: {$reason}" : ""),
        'order_id' => $id,
        'status' => $status,
        'reason' => $reason,
        'order' => $targetOrder
    ], 200);
}
?>
