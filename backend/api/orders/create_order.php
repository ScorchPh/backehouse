<?php
// Create Order Endpoint
//
// Purpose:
// Handles checkout for customer orders (both regular catalog items and custom cakes).
// Uses MySQL database transactions (ACID compliant) to ensure that order placement and inventory deduction
// happen atomically. If stock is insufficient, the transaction safely rolls back with a clear error message.

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$data = getRequestBody();

// Customer and delivery details
$customerName    = trim($data['customer_name'] ?? '');
$customerContact = trim($data['customer_contact'] ?? '');
$deliveryAddress = trim($data['delivery_address'] ?? '');
$items           = $data['items'] ?? [];
$paymentMethod   = trim($data['payment_method'] ?? 'Cash on Delivery');
$userId          = isset($data['user_id']) ? (int)$data['user_id'] : null;

// Fulfillment and scheduling details
$fulfillmentType       = trim($data['fulfillment_type'] ?? 'Delivery');
$deliveryCoordinates   = !empty($data['delivery_coordinates']) ? $data['delivery_coordinates'] : null;
$distanceKm            = isset($data['distance_km']) && is_numeric($data['distance_km']) ? (float)$data['distance_km'] : null;
$estimatedDeliveryTime = trim($data['estimated_delivery_time'] ?? '');
$scheduledDate         = trim($data['scheduled_date'] ?? '');
$scheduledTime         = trim($data['scheduled_time'] ?? '');
$isScheduled           = !empty($data['is_scheduled']) ? 1 : 0;

// Pricing breakdown
$deliveryFee    = (float)($data['delivery_fee'] ?? 50.00);
$discountAmount = (float)($data['discount_amount'] ?? 0.00);
$discountType   = trim($data['discount_type'] ?? '');
$cashTendered   = isset($data['cash_tendered']) && is_numeric($data['cash_tendered']) ? (float)$data['cash_tendered'] : null;
$changeAmount   = isset($data['change_amount']) && is_numeric($data['change_amount']) ? (float)$data['change_amount'] : null;
$cashierName    = trim($data['cashier_name'] ?? '');
$orderStatus    = trim($data['status'] ?? 'Pending');

// Validation rules
if (empty($customerName) || empty($customerContact)) {
    sendResponse(['success' => false, 'message' => 'Customer name and contact number are required.'], 400);
}

if ($fulfillmentType === 'Delivery' && empty($deliveryAddress)) {
    sendResponse(['success' => false, 'message' => 'Delivery address is required for delivery orders.'], 400);
}

if (empty($items) || !is_array($items)) {
    sendResponse(['success' => false, 'message' => 'Your order must contain at least one item.'], 400);
}

// Calculate subtotal from line items
$subtotal = 0.0;
$formattedItems = [];

foreach ($items as $item) {
    $itemPrice = (float)($item['price'] ?? 0.0);
    $itemQty   = max(1, (int)($item['quantity'] ?? 1));
    $subtotal += ($itemPrice * $itemQty);

    $formattedItems[] = [
        'id'            => $item['id'] ?? null,
        'product_id'    => $item['product_id'] ?? $item['id'] ?? null,
        'name'          => $item['name'] ?? 'Bakery Item',
        'price'         => $itemPrice,
        'quantity'      => $itemQty,
        'customization' => $item['customization'] ?? null
    ];
}

// Pickup orders do not charge delivery fees
$effectiveDeliveryFee = ($fulfillmentType === 'Pickup') ? 0.00 : $deliveryFee;
$total = max(0.00, $subtotal + $effectiveDeliveryFee - $discountAmount);

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

// Generate unique order ID in format BH-XXXX
$stmtCount = $pdo->query("SELECT COUNT(*) FROM orders");
$orderNum = (int)$stmtCount->fetchColumn() + 1001;
$orderId = 'BH-' . $orderNum;

// Ensure generated ID is not a duplicate
$stmtCheck = $pdo->prepare("SELECT id FROM orders WHERE id = :id");
$stmtCheck->execute(['id' => $orderId]);
while ($stmtCheck->fetch()) {
    $orderNum++;
    $orderId = 'BH-' . $orderNum;
    $stmtCheck->execute(['id' => $orderId]);
}

try {
    // Start atomic transaction
    $pdo->beginTransaction();

    // 1. Stock validation: locks matching rows using FOR UPDATE to prevent race conditions during simultaneous checkouts
    $stmtCheckStock = $pdo->prepare("SELECT id, name, stock FROM products WHERE id = :id FOR UPDATE");

    foreach ($items as $item) {
        $prodId = isset($item['id']) && is_numeric($item['id']) && (int)$item['id'] < 1000000 ? (int)$item['id'] : null;
        $itemQty = (int)($item['quantity'] ?? 1);
        $prodName = $item['name'] ?? 'Bakery Item';

        if ($prodId) {
            $stmtCheckStock->execute(['id' => $prodId]);
            $currentProd = $stmtCheckStock->fetch();

            if (!$currentProd) {
                throw new Exception("The item '{$prodName}' is no longer available.");
            }

            $currentStock = (int)$currentProd['stock'];
            if ($currentStock < $itemQty) {
                if ($currentStock <= 0) {
                    throw new Exception("Sorry, '{$currentProd['name']}' is out of stock.");
                } else {
                    throw new Exception("Sorry, only {$currentStock} '{$currentProd['name']}' left in stock, but {$itemQty} requested.");
                }
            }
        }
    }

    // 2. Insert main order header record
    $stmtOrder = $pdo->prepare("
        INSERT INTO orders (
            id, user_id, customer_name, customer_contact, fulfillment_type, 
            delivery_address, delivery_coordinates, distance_km, estimated_delivery_time,
            scheduled_date, scheduled_time, is_scheduled,
            payment_method, subtotal, delivery_fee, total, status
        ) VALUES (
            :id, :user_id, :customer_name, :customer_contact, :fulfillment_type,
            :delivery_address, :delivery_coordinates, :distance_km, :estimated_delivery_time,
            :scheduled_date, :scheduled_time, :is_scheduled,
            :payment_method, :subtotal, :delivery_fee, :total, :status
        )
    ");

    $stmtOrder->execute([
        'id'                     => $orderId,
        'user_id'                => $userId ?: null,
        'customer_name'          => $customerName,
        'customer_contact'       => $customerContact,
        'fulfillment_type'       => $fulfillmentType,
        'delivery_address'       => $deliveryAddress,
        'delivery_coordinates'   => !empty($deliveryCoordinates) ? json_encode($deliveryCoordinates) : null,
        'distance_km'            => $distanceKm,
        'estimated_delivery_time'=> $estimatedDeliveryTime ?: null,
        'scheduled_date'         => $scheduledDate ?: null,
        'scheduled_time'         => $scheduledTime ?: null,
        'is_scheduled'           => $isScheduled,
        'payment_method'         => $paymentMethod,
        'subtotal'               => $subtotal,
        'delivery_fee'           => $effectiveDeliveryFee,
        'total'                  => $total,
        'status'                 => $orderStatus
    ]);

    // 3. Insert line items and deduct inventory
    $stmtItem = $pdo->prepare("
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity, customization)
        VALUES (:order_id, :product_id, :product_name, :price, :quantity, :customization)
    ");

    $stmtStock = $pdo->prepare("
        UPDATE products 
        SET stock = GREATEST(0, stock - :qty),
            status = CASE 
                WHEN (stock - :qty1) <= 0 THEN 'Out of Stock' 
                WHEN (stock - :qty2) <= 5 THEN 'Low Stock' 
                ELSE 'Available' 
            END
        WHERE id = :id
    ");

    foreach ($items as $item) {
        $prodId = isset($item['id']) && is_numeric($item['id']) && (int)$item['id'] < 1000000 ? (int)$item['id'] : null;
        $prodName = $item['name'] ?? 'Bakery Item';
        $itemPrice = (float)($item['price'] ?? 0);
        $itemQty = (int)($item['quantity'] ?? 1);
        $customization = isset($item['customization']) ? json_encode($item['customization']) : null;

        $stmtItem->execute([
            'order_id'      => $orderId,
            'product_id'    => $prodId,
            'product_name'  => $prodName,
            'price'         => $itemPrice,
            'quantity'      => $itemQty,
            'customization' => $customization
        ]);

        // Only deduct inventory for catalog items with valid IDs
        if ($prodId) {
            $stmtStock->execute([
                'qty'  => $itemQty,
                'qty1' => $itemQty,
                'qty2' => $itemQty,
                'id'   => $prodId
            ]);

            // Deduct from batches using First-Expired, First-Out (FEFO) if batches exist
            try {
                $batchStmt = $pdo->prepare("
                    SELECT id, quantity 
                    FROM product_batches 
                    WHERE product_id = :product_id AND quantity > 0 AND status = 'Active'
                    ORDER BY expiration_date ASC, id ASC
                ");
                $batchStmt->execute(['product_id' => $prodId]);
                $batches = $batchStmt->fetchAll();

                $remainingToDeduct = $itemQty;
                foreach ($batches as $b) {
                    if ($remainingToDeduct <= 0) break;
                    $bQty = (int)$b['quantity'];
                    $deductFromThisBatch = min($remainingToDeduct, $bQty);
                    $newBQty = $bQty - $deductFromThisBatch;
                    $newBStatus = $newBQty <= 0 ? 'Depleted' : 'Active';

                    $updBatch = $pdo->prepare("
                        UPDATE product_batches 
                        SET quantity = :qty, status = :status 
                        WHERE id = :id
                    ");
                    $updBatch->execute([
                        'qty'    => $newBQty,
                        'status' => $newBStatus,
                        'id'     => $b['id']
                    ]);

                    $remainingToDeduct -= $deductFromThisBatch;
                }

                // Update product's earliest active expiration date
                $rollStmt = $pdo->prepare("
                    SELECT MIN(expiration_date) AS earliest_date 
                    FROM product_batches 
                    WHERE product_id = :product_id AND quantity > 0 AND status = 'Active'
                ");
                $rollStmt->execute(['product_id' => $prodId]);
                $earliestDate = $rollStmt->fetchColumn() ?: null;

                if ($earliestDate !== null) {
                    $updEarliest = $pdo->prepare("UPDATE products SET expiration_date = :exp WHERE id = :id");
                    $updEarliest->execute(['exp' => $earliestDate, 'id' => $prodId]);
                }
            } catch (Throwable $be) {
                // Ignore batch table if not configured, products.stock was already deducted
            }
        }
    }

    // Commit transaction: order and inventory deduction saved together
    $pdo->commit();

    sendResponse([
        'success' => true,
        'message' => 'Order placed successfully!',
        'order'   => [
            'id'                     => $orderId,
            'user_id'                => $userId,
            'customer_name'          => $customerName,
            'customer_contact'       => $customerContact,
            'fulfillment_type'       => $fulfillmentType,
            'delivery_address'       => $deliveryAddress,
            'payment_method'         => $paymentMethod,
            'subtotal'               => $subtotal,
            'delivery_fee'           => $effectiveDeliveryFee,
            'total'                  => $total,
            'status'                 => $orderStatus,
            'created_at'             => date('Y-m-d H:i:s'),
            'formatted_date'         => date('F d, Y'),
            'items'                  => $formattedItems
        ]
    ], 201);

} catch (Exception $e) {
    // If anything fails during the process, roll back changes to maintain database integrity
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse(['success' => false, 'message' => $e->getMessage()], 400);
}
?>
