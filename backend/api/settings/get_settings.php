<?php
// Get store settings from database

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$defaultSettings = [
    'bakery_name'    => 'BAKE HOUSE',
    'email'          => 'info@bakehouse.com',
    'contact_number' => '0917-123-4567',
    'address'        => 'Poblacion, Cordova, Cebu, Philippines',
    'social_links'   => [
        'facebook'  => 'https://facebook.com',
        'instagram' => 'https://instagram.com',
        'tiktok'    => 'https://tiktok.com'
    ],
    'order_settings' => [
        'accept_orders'       => true,
        'allow_customization' => true,
        'delivery_fee'        => 30.00
    ],
    'tax_settings' => [
        'vat_enabled' => true,
        'vat_rate'    => 12.00,
        'vat_type'    => 'exclusive',
        'vat_tin'     => '000-847-293-000'
    ]
];

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

try {
    $stmt = $pdo->prepare("SELECT setting_value FROM store_settings WHERE setting_key = 'store_config' LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch();

    $settings = null;
    if ($row && !empty($row['setting_value'])) {
        $settings = json_decode($row['setting_value'], true);
    }

    // If not found in database yet, initialize with defaults
    if (empty($settings) || !is_array($settings)) {
        $settings = $defaultSettings;
        $insert = $pdo->prepare("
            INSERT INTO store_settings (setting_key, setting_value)
            VALUES ('store_config', :val)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        ");
        $insert->execute(['val' => json_encode($defaultSettings, JSON_UNESCAPED_SLASHES)]);
    } else {
        // Ensure default structure for nested fields
        $settings['social_links'] = array_merge(
            $defaultSettings['social_links'],
            isset($settings['social_links']) && is_array($settings['social_links']) ? $settings['social_links'] : []
        );
        $settings['order_settings'] = array_merge(
            $defaultSettings['order_settings'],
            isset($settings['order_settings']) && is_array($settings['order_settings']) ? $settings['order_settings'] : []
        );
        $settings['tax_settings'] = array_merge(
            $defaultSettings['tax_settings'],
            isset($settings['tax_settings']) && is_array($settings['tax_settings']) ? $settings['tax_settings'] : []
        );
    }

    sendResponse([
        'success'  => true,
        'settings' => $settings
    ]);

} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Failed to load settings: ' . $e->getMessage()], 500);
}
?>
