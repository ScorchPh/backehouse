<?php
/**
 * ============================================================================
 * BAKE HOUSE - Update Order Status API Endpoint
 * ============================================================================
 * Endpoint: POST or PUT /api/orders/update_order_status.php
 * Role: Admin & Staff order fulfillment
 * Accepts: JSON payload { id: "BH-1008", status: "Preparing", reason: "..." }
 *
 * KEY FEATURES:
 * 1. Order Lifecycle Transitions:
 *    Pending -> Confirmed -> Preparing -> Ready for Pickup / For Delivery -> Completed.
 * 2. Cancellation / Denial Reason:
 *    Stores reason string when an order is Denied or Cancelled.
 * 3. Automated Inventory Replenishment:
 *    If an active order is Denied or Cancelled, automatically refunds the reserved
 *    product inventory back into the products catalog table!
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// STEP 1: Load Database Configuration & Helpers
// ----------------------------------------------------------------------------
require_once __DIR__ . '/../../config/db.php';


// ----------------------------------------------------------------------------
// STEP 2: Enforce HTTP Method Verification
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use POST or PUT.'
    ], 405);
}


// ----------------------------------------------------------------------------
// STEP 3: Receive and Validate Inputs
// ----------------------------------------------------------------------------
$data   = getRequestBody();
$id     = trim($data['id'] ?? $_GET['id'] ?? '');
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
    sendResponse([
        'success' => false,
        'message' => 'Order ID and status are required.'
    ], 400);
}

if (!in_array($status, $allowedStatuses)) {
    sendResponse([
        'success' => false,
        'message' => 'Invalid status. Allowed statuses: ' . implode(', ', $allowedStatuses)
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 4: Update Order in Database (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        // Fetch current order to check previous status and prevent double refunds
        $checkStmt = $pdo->prepare("SELECT * FROM orders WHERE id = :id");
        $checkStmt->execute(['id' => $id]);
        $currentOrder = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$currentOrder) {
            sendResponse([
                'success' => false,
                'message' => 'Order not found.'
            ], 404);
        }

        $prevStatus = $currentOrder['status'] ?? 'Pending';

        // Auto-ensure cancellation_reason column exists
        try {
            $pdo->query("ALTER TABLE orders ADD COLUMN cancellation_reason TEXT NULL");
        } catch (Exception $e) {}

        // Update the status and reason
        $stmt = $pdo->prepare("UPDATE orders SET status = :status, cancellation_reason = :reason WHERE id = :id");
        $stmt->execute([
            'status' => $status,
            'reason' => !empty($reason) ? $reason : ($status === 'Denied' || $status === 'Cancelled' ? ($currentOrder['cancellation_reason'] ?? null) : null),
            'id'     => $id
        ]);

        // AUTOMATED INVENTORY REPLENISHMENT:
        // When transitioning to 'Denied' or 'Cancelled' from an active status,
        // automatically restore reserved quantities back to stock!
        if (in_array($status, ['Denied', 'Cancelled']) && !in_array($prevStatus, ['Denied', 'Cancelled', 'Completed'])) {
            $itemsStmt = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = :id");
            $itemsStmt->execute(['id' => $id]);
            $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($orderItems as $it) {
                // Ignore custom 3D cakes (which use ID >= 1000000 or null)
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
            'success'  => true,
            'message'  => "Order {$id} status updated to '{$status}'." . (!empty($reason) ? " Reason: {$reason}" : ""),
            'order_id' => $id,
            'status'   => $status,
            'reason'   => $reason
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
    $orders      = readDataStore('orders');
    $found       = false;
    $targetOrder = null;

    foreach ($orders as &$o) {
        if ($o['id'] === $id) {
            $prevStatus  = $o['status'] ?? 'Pending';
            $o['status'] = $status;
            
            if (!empty($reason)) {
                $o['denial_reason']       = $reason;
                $o['cancellation_reason'] = $reason;
                $o['denied_at']            = date('Y-m-d H:i:s');
            }

            $targetOrder = $o;
            $found       = true;

            // Replenish stock in products.json if denied/cancelled
            if (in_array($status, ['Denied', 'Cancelled']) && !in_array($prevStatus, ['Denied', 'Cancelled', 'Completed'])) {
                $products = readDataStore('products');
                $items    = $o['items'] ?? [];

                foreach ($items as $item) {
                    $prodId = $item['product_id'] ?? $item['id'] ?? null;
                    $qty    = (int)($item['quantity'] ?? 1);

                    if ($prodId && (int)$prodId < 1000000) {
                        foreach ($products as &$p) {
                            if ((int)$p['id'] === (int)$prodId) {
                                $p['stock']  = (int)($p['stock'] ?? 0) + $qty;
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
        sendResponse([
            'success' => false,
            'message' => 'Order not found.'
        ], 404);
    }

    writeDataStore('orders', $orders);

    sendResponse([
        'success'  => true,
        'message'  => "Order {$id} status updated to '{$status}'." . (!empty($reason) ? " Reason: {$reason}" : ""),
        'order_id' => $id,
        'status'   => $status,
        'reason'   => $reason,
        'order'    => $targetOrder
    ], 200);
}
?>
