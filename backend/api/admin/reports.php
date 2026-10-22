<?php
// Sales Reports & Analytics Endpoint
//
// Purpose:
// Generates SQL aggregation queries for admin sales charts and reports:
// 1. Category breakdown: total sales revenue and items sold per product category (Cake, Pastry, Bread).
// 2. Payment methods: order counts and totals grouped by payment method (GCash, Cash on Delivery, Maya).
// 3. Monthly sales velocity: historical monthly revenue trend for the past 6 months.

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
    // LEARNING NOTE 1: Units Sold vs Line Item Count
    // ------------------------------------------------------------------------
    // COUNT(oi.id) only measures the number of rows in the order_items table.
    // If a customer buys 10 Pan de Sal in one line item, COUNT is 1, but
    // the bakery sold 10 units!
    // Using SUM(oi.quantity) gives the true unit volume baked and sold.
    // We join the orders table so we can separate realized sales from cancelled attempts.
    // ========================================================================
    $stmtCat = $pdo->query("
        SELECT COALESCE(p.category, 'Customized') as category,
               COALESCE(SUM(oi.quantity), 0) as items_sold,
               COALESCE(SUM(CASE WHEN LOWER(o.status) NOT IN ('cancelled', 'denied') THEN oi.price * oi.quantity ELSE 0 END), 0) as total_sales,
               COALESCE(SUM(CASE WHEN LOWER(o.status) IN ('cancelled', 'denied') THEN oi.price * oi.quantity ELSE 0 END), 0) as cancelled_sales
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        GROUP BY p.category
    ");
    $categorySales = $stmtCat->fetchAll();
    foreach ($categorySales as &$cs) {
        $cs['items_sold']       = (int)$cs['items_sold'];
        $cs['total_sales']      = (float)$cs['total_sales'];
        $cs['cancelled_sales']  = (float)$cs['cancelled_sales'];
    }

    // ========================================================================
    // LEARNING NOTE 2: Payment Channel Tracking with Attempt History
    // ------------------------------------------------------------------------
    // Tracks both total attempts (order_count) and realized money (total_amount)
    // across all payment methods (GCash, Maya, Cash on Delivery, Counter POS).
    // ========================================================================
    $stmtPay = $pdo->query("
        SELECT payment_method,
               COUNT(*) as order_count,
               COALESCE(SUM(CASE WHEN LOWER(status) NOT IN ('cancelled', 'denied') THEN total ELSE 0 END), 0) as total_amount,
               COALESCE(SUM(CASE WHEN LOWER(status) IN ('cancelled', 'denied') THEN total ELSE 0 END), 0) as cancelled_amount
        FROM orders
        GROUP BY payment_method
    ");
    $paymentStats = $stmtPay->fetchAll();
    foreach ($paymentStats as &$ps) {
        $ps['order_count']      = (int)$ps['order_count'];
        $ps['total_amount']     = (float)$ps['total_amount'];
        $ps['cancelled_amount'] = (float)$ps['cancelled_amount'];
    }

    // ========================================================================
    // LEARNING NOTE 3: Historical Monthly Velocity & Trend Analytics
    // ------------------------------------------------------------------------
    // Captures all customer order attempts per month alongside net realized revenue.
    // ========================================================================
    $stmtMonthly = $pdo->query("
        SELECT DATE_FORMAT(created_at, '%b %Y') as month_year,
               COUNT(*) as total_orders,
               COALESCE(SUM(CASE WHEN LOWER(status) NOT IN ('cancelled', 'denied') THEN total ELSE 0 END), 0) as monthly_revenue,
               COALESCE(SUM(CASE WHEN LOWER(status) IN ('cancelled', 'denied') THEN total ELSE 0 END), 0) as cancelled_revenue
        FROM orders
        GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
        ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC
        LIMIT 6
    ");
    $monthlySales = $stmtMonthly->fetchAll();
    foreach ($monthlySales as &$ms) {
        $ms['total_orders']      = (int)$ms['total_orders'];
        $ms['monthly_revenue']   = (float)$ms['monthly_revenue'];
        $ms['cancelled_revenue'] = (float)$ms['cancelled_revenue'];
    }

    sendResponse([
        'success'        => true,
        'category_sales' => $categorySales,
        'payment_stats'  => $paymentStats,
        'monthly_sales'  => $monthlySales
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Reports error: ' . $e->getMessage()], 500);
}
?>
