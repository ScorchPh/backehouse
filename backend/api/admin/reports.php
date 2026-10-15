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
    // 1. Sales by Product Category
    $stmtCat = $pdo->query("
        SELECT COALESCE(p.category, 'Customized') as category,
               COUNT(oi.id) as items_sold,
               COALESCE(SUM(oi.price * oi.quantity), 0) as total_sales
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        GROUP BY p.category
    ");
    $categorySales = $stmtCat->fetchAll();

    // 2. Sales by Payment Method
    $stmtPay = $pdo->query("
        SELECT payment_method,
               COUNT(*) as order_count,
               COALESCE(SUM(total), 0) as total_amount
        FROM orders
        GROUP BY payment_method
    ");
    $paymentStats = $stmtPay->fetchAll();

    // 3. Monthly Sales History (past 6 months)
    $stmtMonthly = $pdo->query("
        SELECT DATE_FORMAT(created_at, '%b %Y') as month_year,
               COUNT(*) as total_orders,
               COALESCE(SUM(total), 0) as monthly_revenue
        FROM orders
        GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
        ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC
        LIMIT 6
    ");
    $monthlySales = $stmtMonthly->fetchAll();

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
