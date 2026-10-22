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
    // ========================================================================
    // LEARNING NOTE: Efficient Order Lifecycle Metrics & Attempt Tracking
    // ------------------------------------------------------------------------
    // In business analytics, keeping track of *attempted* orders (including
    // Cancelled and Denied) helps calculate conversion/completion rates.
    // Meanwhile, Realized Revenue must strictly exclude cancelled transactions
    // so financial earnings aren't falsely overstated.
    //
    // By using SQL conditional aggregation (SUM(CASE WHEN ...)), MySQL counts
    // every order status in a single table scan instead of 7 separate queries.
    // ========================================================================
    $orderMetricsStmt = $pdo->query("
        SELECT 
            COUNT(*) AS total_orders,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'preparing' THEN 1 ELSE 0 END), 0) AS preparing_orders,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'for delivery' THEN 1 ELSE 0 END), 0) AS delivery_orders,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END), 0) AS completed_orders,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'denied' THEN 1 ELSE 0 END), 0) AS denied_orders,
            COALESCE(SUM(CASE WHEN LOWER(status) NOT IN ('cancelled', 'denied') THEN total ELSE 0 END), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN LOWER(status) IN ('cancelled', 'denied') THEN total ELSE 0 END), 0) AS cancelled_revenue
        FROM orders
    ");
    $orderMetrics = $orderMetricsStmt->fetch();

    $totalOrders      = (int)($orderMetrics['total_orders'] ?? 0);
    $pendingOrders    = (int)($orderMetrics['pending_orders'] ?? 0);
    $preparingOrders  = (int)($orderMetrics['preparing_orders'] ?? 0);
    $deliveryOrders   = (int)($orderMetrics['delivery_orders'] ?? 0);
    $completedOrders  = (int)($orderMetrics['completed_orders'] ?? 0);
    $cancelledOrders  = (int)($orderMetrics['cancelled_orders'] ?? 0);
    $deniedOrders     = (int)($orderMetrics['denied_orders'] ?? 0);
    $totalRevenue     = (float)($orderMetrics['total_revenue'] ?? 0);
    $cancelledRevenue = (float)($orderMetrics['cancelled_revenue'] ?? 0);

    // 2. Inventory stock counts
    $totalProducts      = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    $availableProducts  = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock > 5")->fetchColumn();
    $lowStockProducts   = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock > 0 AND stock <= 5")->fetchColumn();
    $outOfStockProducts = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock <= 0")->fetchColumn();

    // 3. Total customer count
    $totalCustomers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();

    // 4. 5 most recent orders for live feed (preserves full attempt history)
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

    // ========================================================================
    // LEARNING NOTE: Primary Key Foreign Key Joins for Bestsellers
    // ------------------------------------------------------------------------
    // Joining order_items on product_id ensures that even if an admin renames
    // a product (e.g. from 'Chocolate Cake' to 'Signature Chocolate Cake'),
    // historical sales stay connected.
    // We join orders to ensure only valid/completed purchases count towards
    // bestselling rankings, excluding cancelled or denied transactions.
    // ========================================================================
    $stmtPopular = $pdo->query("
        SELECT p.id, p.name, p.category, p.price, p.image,
               COALESCE(SUM(oi.quantity), 0) as total_sold
        FROM products p
        LEFT JOIN order_items oi ON (p.id = oi.product_id OR (oi.product_id IS NULL AND p.name = oi.product_name))
        LEFT JOIN orders o ON oi.order_id = o.id AND LOWER(o.status) NOT IN ('cancelled', 'denied')
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
            'cancelled_orders'      => $cancelledOrders,
            'denied_orders'         => $deniedOrders,
            'total_revenue'         => $totalRevenue,
            'cancelled_revenue'     => $cancelledRevenue,
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
