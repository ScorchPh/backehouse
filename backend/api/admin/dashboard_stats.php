<?php
// Admin Dashboard Stats Endpoint
//
// Purpose:
// Computes live Key Performance Indicators (KPIs) for the store management dashboard:
// - Real-time order counts grouped by status (Pending, Preparing, For Delivery, Completed)
// - Gross revenue summation (excluding cancelled and denied orders)
// - Inventory health metrics (Available items, Low Stock <= 5, Out of Stock = 0)
// - Total registered customer count
// - 5 most recent orders for the activity feed
// - Top 4 bestselling products calculated from order items

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    // 1. Order counts by fulfillment status
    $totalOrders     = (int)$pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
    $pendingOrders   = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE LOWER(status) = 'pending'")->fetchColumn();
    $preparingOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE LOWER(status) = 'preparing'")->fetchColumn();
    $deliveryOrders  = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE LOWER(status) = 'for delivery'")->fetchColumn();
    $completedOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE LOWER(status) = 'completed'")->fetchColumn();

    // 2. Gross revenue (sums total amount of completed/active orders, ignoring cancelled/denied)
    $totalRevenue = (float)$pdo->query("
        SELECT COALESCE(SUM(total), 0) 
        FROM orders 
        WHERE LOWER(status) NOT IN ('cancelled', 'denied')
    ")->fetchColumn();

    // 3. Inventory stock counts
    $totalProducts      = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    $availableProducts  = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock > 5")->fetchColumn();
    $lowStockProducts   = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock > 0 AND stock <= 5")->fetchColumn();
    $outOfStockProducts = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock <= 0")->fetchColumn();

    // 4. Total customer count
    $totalCustomers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();

    // 5. 5 most recent orders for live feed
    $stmtRecent = $pdo->query("
        SELECT id, customer_name, total, status, created_at,
               DATE_FORMAT(created_at, '%M %d, %Y') as formatted_date
        FROM orders
        ORDER BY created_at DESC
        LIMIT 5
    ");
    $recentOrders = $stmtRecent->fetchAll();
    foreach ($recentOrders as &$ro) {
        $ro['total'] = (float)$ro['total'];
    }

    // 6. Top 4 bestselling products calculated from order line items
    $stmtPopular = $pdo->query("
        SELECT p.id, p.name, p.category, p.price, p.image,
               COALESCE(SUM(oi.quantity), 0) as total_sold
        FROM products p
        LEFT JOIN order_items oi ON p.name = oi.product_name
        GROUP BY p.id, p.name, p.category, p.price, p.image
        ORDER BY total_sold DESC, p.bestseller DESC
        LIMIT 4
    ");
    $popularProducts = $stmtPopular->fetchAll();
    foreach ($popularProducts as &$pp) {
        $pp['price']      = (float)$pp['price'];
        $pp['total_sold'] = (int)$pp['total_sold'];
    }

    sendResponse([
        'success' => true,
        'stats'   => [
            'total_orders'          => $totalOrders,
            'pending_orders'        => $pendingOrders,
            'preparing_orders'      => $preparingOrders,
            'delivery_orders'       => $deliveryOrders,
            'completed_orders'      => $completedOrders,
            'total_revenue'         => $totalRevenue,
            'formatted_revenue'     => '₱' . number_format($totalRevenue, 2),
            'total_products'        => $totalProducts,
            'available_products'    => $availableProducts,
            'low_stock_products'    => $lowStockProducts,
            'out_of_stock_products' => $outOfStockProducts,
            'total_customers'       => $totalCustomers
        ],
        'recent_orders'    => $recentOrders,
        'popular_products' => $popularProducts
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Dashboard error: ' . $e->getMessage()], 500);
}
?>
