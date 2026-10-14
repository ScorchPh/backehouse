<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Store Settings API Endpoint
 * ============================================================================
 * Endpoint: GET /api/settings/get_settings.php
 *
 * Serves bakery store settings including:
 * - Bakery name, contact phone, email, address
 * - Social media links (Facebook, Instagram, TikTok)
 * - Order options (accept orders, cake customizer enabled)
 * ============================================================================
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use GET.'
    ], 405);
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

$stored = readDataStore('store_settings');

if (empty($stored) || !is_array($stored)) {
    writeDataStore('store_settings', $defaultSettings);
    $stored = $defaultSettings;
} else {
    // Ensure nested fields exist
    $stored['social_links'] = array_merge(
        $defaultSettings['social_links'],
        isset($stored['social_links']) && is_array($stored['social_links']) ? $stored['social_links'] : []
    );
    $stored['order_settings'] = array_merge(
        $defaultSettings['order_settings'],
        isset($stored['order_settings']) && is_array($stored['order_settings']) ? $stored['order_settings'] : []
    );
    $stored['tax_settings'] = array_merge(
        $defaultSettings['tax_settings'],
        isset($stored['tax_settings']) && is_array($stored['tax_settings']) ? $stored['tax_settings'] : []
    );
}

sendResponse([
    'success'  => true,
    'settings' => $stored
]);
