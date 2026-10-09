<?php
/**
 * ============================================================================
 * BAKE HOUSE - Update Store Settings API Endpoint
 * ============================================================================
 * Endpoint: POST /api/settings/update_settings.php
 *
 * Saves updated store settings, including custom social media URLs.
 * ============================================================================
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use POST.'
    ], 405);
}

$payload = getRequestBody();

if (empty($payload) || !is_array($payload)) {
    sendResponse([
        'success' => false,
        'message' => 'Invalid or empty settings data provided.'
    ], 400);
}

// Read current settings
$current = readDataStore('store_settings');
if (empty($current) || !is_array($current)) {
    $current = [
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
            'allow_customization' => true
        ]
    ];
}

// Helper to sanitize URL
function sanitizeSocialUrl($url) {
    if (empty($url) || !is_string($url)) return '';
    $trimmed = trim($url);
    if ($trimmed === '') return '';
    if (!preg_match('~^(?:f|ht)tps?://~i', $trimmed) && !str_starts_with($trimmed, '#')) {
        $trimmed = 'https://' . $trimmed;
    }
    return filter_var($trimmed, FILTER_SANITIZE_URL) ?: $trimmed;
}

// Update bakery information if provided
if (isset($payload['bakery_name'])) {
    $current['bakery_name'] = trim((string)$payload['bakery_name']);
}
if (isset($payload['email'])) {
    $current['email'] = trim((string)$payload['email']);
}
if (isset($payload['contact_number'])) {
    $current['contact_number'] = trim((string)$payload['contact_number']);
}
if (isset($payload['address'])) {
    $current['address'] = trim((string)$payload['address']);
}

// Update social media links if provided
if (isset($payload['social_links']) && is_array($payload['social_links'])) {
    if (!isset($current['social_links']) || !is_array($current['social_links'])) {
        $current['social_links'] = [];
    }
    foreach (['facebook', 'instagram', 'tiktok'] as $platform) {
        if (isset($payload['social_links'][$platform])) {
            $current['social_links'][$platform] = sanitizeSocialUrl($payload['social_links'][$platform]);
        }
    }
}

// Update order settings if provided
if (isset($payload['order_settings']) && is_array($payload['order_settings'])) {
    if (!isset($current['order_settings']) || !is_array($current['order_settings'])) {
        $current['order_settings'] = [];
    }
    if (isset($payload['order_settings']['accept_orders'])) {
        $current['order_settings']['accept_orders'] = (bool)$payload['order_settings']['accept_orders'];
    }
    if (isset($payload['order_settings']['allow_customization'])) {
        $current['order_settings']['allow_customization'] = (bool)$payload['order_settings']['allow_customization'];
    }
}

// Persist to JSON data store
writeDataStore('store_settings', $current);

// Sync with MySQL if database connection is available
try {
    $pdo = getDBConnection();
    if ($pdo) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `store_settings` (
                `setting_key` VARCHAR(100) PRIMARY KEY,
                `setting_value` LONGTEXT NULL,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        $stmt = $pdo->prepare("
            INSERT INTO `store_settings` (`setting_key`, `setting_value`)
            VALUES ('store_config', :val)
            ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
        ");
        $stmt->execute(['val' => json_encode($current, JSON_UNESCAPED_SLASHES)]);
    }
} catch (Exception $e) {
    // Graceful fallback to JSON file storage
}

sendResponse([
    'success'  => true,
    'message'  => 'Store settings updated successfully!',
    'settings' => $current
]);
