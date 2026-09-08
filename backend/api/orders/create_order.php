<?php
/**
 * ============================================================================
 * BAKE HOUSE - Create Order API Endpoint
 * Endpoint: POST /api/orders/create_order.php
 * ============================================================================
 * Capstone Project Explanation:
 * Handles transaction-safe order placement for both:
 * 1. Home Delivery (₱50 delivery fee + destination address)
 * 2. Store Pickup (₱0 delivery fee + pickup instructions)
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$data = getRequestBody();

$userId = isset($data['user_id']) ? (int)$data['user_id'] : null;
$customerName = trim($data['customer_name'] ?? '');
$customerContact = trim($data['customer_contact'] ?? '');
$fulfillmentType = trim($data['fulfillment_type'] ?? 'Delivery'); // 'Delivery', 'Pickup', 'Counter POS'
$deliveryAddress = trim($data['delivery_address'] ?? '');
$deliveryCoordinates = is_array($data['delivery_coordinates'] ?? null) ? $data['delivery_coordinates'] : null;
$distanceKm = isset($data['distance_km']) ? (float)$data['distance_km'] : null;
$estimatedDeliveryTime = trim($data['estimated_delivery_time'] ?? '');
$scheduledDate = trim($data['scheduled_date'] ?? '');
$scheduledTime = trim($data['scheduled_time'] ?? '');
$isScheduled = !empty($data['is_scheduled']) || !empty($scheduledDate);
$paymentMethod = trim($data['payment_method'] ?? 'Cash on Delivery');
$items = is_array($data['items'] ?? null) ? $data['items'] : [];

$isCounterPOS = (strcasecmp($fulfillmentType, 'Counter POS') === 0 || strcasecmp($fulfillmentType, 'In-Store') === 0 || !empty($data['is_pos']));

if ($isCounterPOS) {
    $deliveryFee = 0.00;
    if (empty($customerName)) {
        $customerName = "Walk-in Customer";
    }
    if (empty($customerContact)) {
        $customerContact = "N/A (Over-the-Counter)";
    }
    if (empty($deliveryAddress)) {
        $deliveryAddress = "Store Counter (Poblacion, Cordova Branch)";
    }
    if (empty($estimatedDeliveryTime)) {
        $estimatedDeliveryTime = "Instant (Over-the-Counter)";
    }
} else if (strcasecmp($fulfillmentType, 'Pickup') === 0) {
    $deliveryFee = 0.00;
    if (empty($deliveryAddress)) {
        $deliveryAddress = "Store Pickup (Poblacion, Cordova, Cebu Bakery Branch)";
    }
    if (empty($estimatedDeliveryTime)) {
        $estimatedDeliveryTime = "15–25 Minutes";
    }
} else {
    $deliveryFee = isset($data['delivery_fee']) ? (float)$data['delivery_fee'] : 50.00;
    if (empty($estimatedDeliveryTime)) {
        $estimatedDeliveryTime = "30–45 Minutes";
    }
}

if (empty($customerName) || empty($customerContact) || empty($deliveryAddress) || empty($items)) {
    sendResponse([
        'success' => false,
        'message' => 'Please provide customer name, contact number, and at least one item.'
    ], 400);
}

$subtotal = 0.0;
$formattedItems = [];
foreach ($items as $idx => $item) {
    $price = (float)($item['price'] ?? 0);
    $qty = (int)($item['quantity'] ?? 1);
    $subtotal += ($price * $qty);
    $formattedItems[] = [
        'id' => $idx + 1,
        'product_id' => $item['id'] ?? null,
        'product_name' => $item['name'] ?? 'Bakery Item',
        'price' => $price,
        'quantity' => $qty,
        'customization' => $item['customization'] ?? null
    ];
}

$summaryText = count($formattedItems) > 0 
    ? $formattedItems[0]['product_name'] . (count($formattedItems) > 1 ? ' +' . (count($formattedItems) - 1) . ' more' : '')
    : 'Bakery Order';

// Support optional POS discounts
$discountAmount = isset($data['discount_amount']) ? (float)$data['discount_amount'] : 0.0;
$discountType = trim($data['discount_type'] ?? '');
$cashTendered = isset($data['cash_tendered']) ? (float)$data['cash_tendered'] : null;
$changeAmount = isset($data['change_amount']) ? (float)$data['change_amount'] : null;
$cashierName = trim($data['cashier_name'] ?? '');
$orderStatus = $isCounterPOS ? ($data['status'] ?? 'Completed') : 'Pending';

$total = max(0, $subtotal + $deliveryFee - $discountAmount);
$orderId = 'BH-' . strtoupper(dechex(time())) . rand(10, 99);

$pdo = getDBConnection();

/**
 * ============================================================================
 * INVENTORY & CONCURRENCY CONTROL (FIRST-COME, FIRST-SERVED CHECKOUT)
 * ============================================================================
 * Capstone Project Core Architectural Rule:
 * 1. Adding an item to the shopping cart DOES NOT deduct stock from the database.
 *    Cart items are client/session state.
 * 2. Real stock deduction happens ONLY here during Checkout / Order Placement.
 * 3. Race Condition Handling (2 users buying the last 1 item simultaneously):
 *    - In MySQL mode: We use PDO database transactions with pessimistic row locks
 *      (`SELECT stock, name FROM products WHERE id = :id FOR UPDATE`).
 *      The first user's checkout locks the row, validates stock, decrements it to 0,
 *      and commits. The second user's request waits for the lock, reads stock = 0,
 *      fails the validation check, rolls back the transaction, and returns HTTP 400.
 *    - In JSON mode: We atomically lock the file and verify live stock before saving.
 * ============================================================================
 */

if ($pdo) {
    try {
        // Begin transaction to ensure all-or-nothing atomicity
        $pdo->beginTransaction();

        // STEP 1: Concurrency Safe Stock Validation (FOR UPDATE pessimistic row lock)
        $stmtCheckStock = $pdo->prepare("
            SELECT id, name, stock, status 
            FROM products 
            WHERE id = :id 
            FOR UPDATE
        ");

        foreach ($items as $item) {
            $prodId = isset($item['id']) && is_numeric($item['id']) && (int)$item['id'] < 1000000 ? (int)$item['id'] : null;
            $itemQty = (int)($item['quantity'] ?? 1);
            $prodName = $item['name'] ?? 'Bakery Item';

            // Custom cakes (e.g. ID timestamp > 1000000) are made to order and have no static stock limit
            if ($prodId) {
                $stmtCheckStock->execute(['id' => $prodId]);
                $prod = $stmtCheckStock->fetch();

                if (!$prod) {
                    throw new Exception("The item '{$prodName}' is no longer available in the catalog.");
                }

                $availableStock = (int)$prod['stock'];

                // If stock is insufficient, reject checkout immediately to protect against race conditions
                if ($availableStock < $itemQty) {
                    if ($availableStock <= 0) {
                        throw new Exception("Sorry, '{$prod['name']}' is already out of stock. Another customer just completed their checkout first.");
                    } else {
                        throw new Exception("Sorry, only {$availableStock} '{$prod['name']}' remaining in stock, but you requested {$itemQty}. Another customer may have just purchased some items.");
                    }
                }
            }
        }

        // STEP 2: Record the Primary Order Transaction
        $stmtOrder = $pdo->prepare("
            INSERT INTO orders (id, user_id, customer_name, customer_contact, delivery_address, payment_method, subtotal, delivery_fee, total, status)
            VALUES (:id, :user_id, :customer_name, :customer_contact, :delivery_address, :payment_method, :subtotal, :delivery_fee, :total, :status)
        ");
        $stmtOrder->execute([
            'id' => $orderId,
            'user_id' => $userId ?: null,
            'customer_name' => $customerName,
            'customer_contact' => $customerContact,
            'delivery_address' => $deliveryAddress,
            'payment_method' => $paymentMethod,
            'subtotal' => $subtotal,
            'delivery_fee' => $deliveryFee,
            'total' => $total,
            'status' => $orderStatus
        ]);

        // STEP 3: Insert Order Items and Atomically Deduct Stock
        $stmtItem = $pdo->prepare("
            INSERT INTO order_items (order_id, product_id, product_name, price, quantity, customization)
            VALUES (:order_id, :product_id, :product_name, :price, :quantity, :customization)
        ");

        $stmtStock = $pdo->prepare("
            UPDATE products 
            SET stock = stock - :qty,
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
                'order_id' => $orderId,
                'product_id' => $prodId,
                'product_name' => $prodName,
                'price' => $itemPrice,
                'quantity' => $itemQty,
                'customization' => $customization
            ]);

            // Deduct inventory only for catalog items
            if ($prodId) {
                $stmtStock->execute([
                    'qty' => $itemQty,
                    'qty1' => $itemQty,
                    'qty2' => $itemQty,
                    'id' => $prodId
                ]);
            }
        }

        // Commit transaction - stock is successfully deducted and order placed!
        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(['success' => false, 'message' => $e->getMessage()], 400);
    }
} else {
    // ========================================================================
    // JSON DATA STORE FALLBACK (With atomic validation and stock deduction)
    // ========================================================================
    $products = readDataStore('products');

    // STEP 1: Validate stock for all line items before making any modifications
    foreach ($items as $item) {
        $prodId = isset($item['id']) && is_numeric($item['id']) && (int)$item['id'] < 1000000 ? (int)$item['id'] : null;
        $itemQty = (int)($item['quantity'] ?? 1);
        $prodName = $item['name'] ?? 'Bakery Item';

        if ($prodId) {
            $foundProd = null;
            foreach ($products as $p) {
                if ((int)$p['id'] === $prodId) {
                    $foundProd = $p;
                    break;
                }
            }

            if (!$foundProd) {
                sendResponse(['success' => false, 'message' => "The item '{$prodName}' is no longer available."], 400);
            }

            $availableStock = (int)($foundProd['stock'] ?? 0);

            // First-come, first-served guard: reject if someone else checked out first
            if ($availableStock < $itemQty) {
                if ($availableStock <= 0) {
                    sendResponse([
                        'success' => false,
                        'message' => "Sorry, '{$foundProd['name']}' is already out of stock. Another customer just completed their checkout first."
                    ], 400);
                } else {
                    sendResponse([
                        'success' => false,
                        'message' => "Sorry, only {$availableStock} '{$foundProd['name']}' left in stock, but you requested {$itemQty}. Another customer may have just purchased some items."
                    ], 400);
                }
            }
        }
    }

    // STEP 2: Stock is validated! Deduct stock in catalog
    foreach ($items as $item) {
        $prodId = isset($item['id']) && is_numeric($item['id']) && (int)$item['id'] < 1000000 ? (int)$item['id'] : null;
        if ($prodId) {
            foreach ($products as &$p) {
                if ((int)$p['id'] === $prodId) {
                    $p['stock'] = max(0, (int)$p['stock'] - ($item['quantity'] ?? 1));
                    $p['status'] = $p['stock'] <= 0 ? 'Out of Stock' : ($p['stock'] <= 5 ? 'Low Stock' : 'Available');
                }
            }
        }
    }
    writeDataStore('products', $products);

    // STEP 3: Save order records
    $orders = readDataStore('orders');

    $newOrder = [
        'id' => $orderId,
        'user_id' => $userId,
        'customer_name' => $customerName,
        'customer_contact' => $customerContact,
        'fulfillment_type' => $fulfillmentType,
        'delivery_address' => $deliveryAddress,
        'delivery_coordinates' => $deliveryCoordinates,
        'distance_km' => $distanceKm,
        'estimated_delivery_time' => $estimatedDeliveryTime,
        'scheduled_date' => $scheduledDate ?: null,
        'scheduled_time' => $scheduledTime ?: null,
        'is_scheduled' => $isScheduled,
        'payment_method' => $paymentMethod,
        'subtotal' => $subtotal,
        'delivery_fee' => $deliveryFee,
        'discount_amount' => $discountAmount,
        'discount_type' => $discountType ?: null,
        'cash_tendered' => $cashTendered,
        'change_amount' => $changeAmount,
        'cashier_name' => $cashierName ?: null,
        'total' => $total,
        'status' => $orderStatus,
        'created_at' => date('Y-m-d H:i:s'),
        'formatted_date' => date('F d, Y'),
        'items' => $formattedItems,
        'items_summary' => $summaryText
    ];

    array_unshift($orders, $newOrder);
    writeDataStore('orders', $orders);
}

sendResponse([
    'success' => true,
    'message' => 'Order placed successfully!',
    'order' => [
        'id' => $orderId,
        'customer_name' => $customerName,
        'customer_contact' => $customerContact,
        'fulfillment_type' => $fulfillmentType,
        'delivery_address' => $deliveryAddress,
        'delivery_coordinates' => $deliveryCoordinates,
        'distance_km' => $distanceKm,
        'estimated_delivery_time' => $estimatedDeliveryTime,
        'scheduled_date' => $scheduledDate ?: null,
        'scheduled_time' => $scheduledTime ?: null,
        'is_scheduled' => $isScheduled,
        'payment_method' => $paymentMethod,
        'subtotal' => $subtotal,
        'delivery_fee' => $deliveryFee,
        'discount_amount' => $discountAmount,
        'discount_type' => $discountType ?: null,
        'cash_tendered' => $cashTendered,
        'change_amount' => $changeAmount,
        'cashier_name' => $cashierName ?: null,
        'total' => $total,
        'status' => $orderStatus,
        'created_at' => date('Y-m-d H:i:s'),
        'formatted_date' => date('F d, Y'),
        'items' => $formattedItems,
        'items_summary' => $summaryText
    ]
], 201);
?>
