<?php
/**
 * ============================================================================
 * BAKE HOUSE - Backend API Entry & Server Health Status
 * ============================================================================
 */

require_once __DIR__ . '/config/cors.php';

header('Content-Type: application/json; charset=UTF-8');

echo json_encode([
    'project' => 'BAKE-HOUSE Bakery System API',
    'status' => 'online',
    'version' => '1.0.0',
    'roles' => ['admin', 'staff', 'customer'],
    'endpoints' => [
        'auth' => [
            'login' => '/api/auth/login.php',
            'register' => '/api/auth/register.php',
            'google_login' => '/api/auth/google_login.php',
            'profile' => '/api/auth/profile.php',
            'customers' => '/api/auth/customers.php'
        ],
        'products' => [
            'get_products' => '/api/products/get_products.php',
            'get_product' => '/api/products/get_product.php',
            'create_product' => '/api/products/create_product.php',
            'update_product' => '/api/products/update_product.php',
            'delete_product' => '/api/products/delete_product.php'
        ],
        'orders' => [
            'create_order' => '/api/orders/create_order.php',
            'get_orders' => '/api/orders/get_orders.php',
            'get_order_details' => '/api/orders/get_order_details.php',
            'update_order_status' => '/api/orders/update_order_status.php'
        ],
        'personalize' => [
            'submit_custom_cake' => '/api/personalize/submit_custom_cake.php'
        ],
        'contact' => [
            'send_message' => '/api/contact/send_message.php',
            'get_messages' => '/api/contact/get_messages.php'
        ],
        'admin' => [
            'dashboard_stats' => '/api/admin/dashboard_stats.php',
            'reports' => '/api/admin/reports.php'
        ],
        'database_setup' => '/database/setup.php'
    ],
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
