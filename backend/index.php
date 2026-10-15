<?php
// Backend API entry and health status

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
            'google_config' => '/api/auth/google_config.php',
            'profile' => '/api/auth/profile.php',
            'update_profile' => '/api/auth/update_profile.php',
            'customers' => '/api/auth/customers.php'
        ],
        'products' => [
            'get_products' => '/api/products/get_products.php',
            'get_product' => '/api/products/get_product.php',
            'create_product' => '/api/products/create_product.php',
            'update_product' => '/api/products/update_product.php',
            'delete_product' => '/api/products/delete_product.php',
            'upload_image' => '/api/products/upload_image.php'
        ],
        'orders' => [
            'create_order' => '/api/orders/create_order.php',
            'get_orders' => '/api/orders/get_orders.php',
            'get_order_details' => '/api/orders/get_order_details.php',
            'update_order_status' => '/api/orders/update_order_status.php'
        ],
        'personalize' => [
            'get_customizer_options' => '/api/personalize/get_customizer_options.php',
            'save_customizer_options' => '/api/personalize/save_customizer_options.php',
            'submit_custom_cake' => '/api/personalize/submit_custom_cake.php',
            'cake_chat' => '/api/personalize/cake_chat.php'
        ],
        'contact' => [
            'send_message' => '/api/contact/send_message.php',
            'get_messages' => '/api/contact/get_messages.php'
        ],
        'settings' => [
            'get_settings' => '/api/settings/get_settings.php',
            'update_settings' => '/api/settings/update_settings.php'
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
