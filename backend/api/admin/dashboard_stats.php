<?php
/**
 * ============================================================================
 * BAKE HOUSE - Admin & Staff Dashboard KPIs API Endpoint
 * Endpoint: GET /api/admin/dashboard_stats.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$pdo = getDBConnection();

if ($pdo) {
    try {
        $totalOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
        $pendingOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE LOWER(status) = 'pending'")->fetchColumn();
        $preparingOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE LOWER(status) = 'preparing'")->fetchColumn();
        $deliveryOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE LOWER(status) = 'for delivery'")->fetchColumn();
        $completedOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE LOWER(status) = 'completed'")->fetchColumn();

        $totalRevenue = (float)$pdo->query("SELECT COALESCE(SUM(total), 0) FROM orders WHERE LOWER(status) != 'cancelled'")->fetchColumn();

        $totalProducts = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
        $availableProducts = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock > 5")->fetchColumn();
        $lowStockProducts = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock > 0 AND stock <= 5")->fetchColumn();
        $outOfStockProducts = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock <= 0")->fetchColumn();
        $totalCustomers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();

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
            $pp['price'] = (float)$pp['price'];
            $pp['total_sold'] = (int)$pp['total_sold'];
        }

        sendResponse([
            'success' => true,
            'stats' => [
                'total_orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'preparing_orders' => $preparingOrders,
                'delivery_orders' => $deliveryOrders,
                'completed_orders' => $completedOrders,
                'total_revenue' => $totalRevenue,
                'formatted_revenue' => '₱' . number_format($totalRevenue, 2),
                'total_products' => $totalProducts,
                'available_products' => $availableProducts,
                'low_stock_products' => $lowStockProducts,
                'out_of_stock_products' => $outOfStockProducts,
                'total_customers' => $totalCustomers
            ],
            'recent_orders' => $recentOrders,
            'popular_products' => $popularProducts
        ], 200);

    } catch (PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Dashboard error: ' . $e->getMessage()], 500);
    }
} else {
    $orders = readDataStore('orders');
    $products = readDataStore('products');
    $users = readDataStore('users');

    $totalOrders = count($orders);
    $pendingOrders = 0;
    $preparingOrders = 0;
    $deliveryOrders = 0;
    $completedOrders = 0;
    $totalRevenue = 0.0;

    foreach ($orders as $o) {
        $st = strtolower($o['status'] ?? '');
        if ($st === 'pending') $pendingOrders++;
        elseif ($st === 'preparing') $preparingOrders++;
        elseif ($st === 'for delivery' || $st === 'delivery') $deliveryOrders++;
        elseif ($st === 'completed') $completedOrders++;

        if ($st !== 'cancelled') {
            $totalRevenue += (float)($o['total'] ?? 0);
        }
    }

    $totalProducts = count($products);
    $availableProducts = 0;
    $lowStockProducts = 0;
    $outOfStockProducts = 0;

    foreach ($products as $p) {
        $stk = (int)($p['stock'] ?? 0);
        if ($stk <= 0) $outOfStockProducts++;
        elseif ($stk <= 5) $lowStockProducts++;
        else $availableProducts++;
    }

    $totalCustomers = count(array_filter($users, fn($u) => ($u['role'] ?? '') === 'customer'));
    $recentOrders = array_slice($orders, 0, 5);

    $popularProducts = array_slice(array_filter($products, fn($p) => !empty($p['bestseller'])), 0, 4);
    if (empty($popularProducts)) {
        $popularProducts = array_slice($products, 0, 4);
    }

    sendResponse([
        'success' => true,
        'stats' => [
            'total_orders' => $totalOrders,
            'pending_orders' => $pendingOrders,
            'preparing_orders' => $preparingOrders,
            'delivery_orders' => $deliveryOrders,
            'completed_orders' => $completedOrders,
            'total_revenue' => $totalRevenue,
            'formatted_revenue' => '₱' . number_format($totalRevenue, 2),
            'total_products' => $totalProducts,
            'available_products' => $availableProducts,
            'low_stock_products' => $lowStockProducts,
            'out_of_stock_products' => $outOfStockProducts,
            'total_customers' => $totalCustomers
        ],
        'recent_orders' => $recentOrders,
        'popular_products' => $popularProducts
    ], 200);
}
?>
