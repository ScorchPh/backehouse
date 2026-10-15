<?php
// Update store settings in database

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$payload = getRequestBody();
if (empty($payload) || !is_array($payload)) {
    sendResponse(['success' => false, 'message' => 'Invalid or empty settings data'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

// Fetch current settings from database
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

try {
    $stmt = $pdo->prepare("SELECT setting_value FROM store_settings WHERE setting_key = 'store_config' LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch();
    if ($row && !empty($row['setting_value'])) {
        $decoded = json_decode($row['setting_value'], true);
        if (is_array($decoded)) {
            $current = array_merge($current, $decoded);
        }
    }
} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Failed to load existing settings: ' . $e->getMessage()], 500);
}

// Helper to sanitize URLs
function sanitizeSocialUrl(mixed $url): string {
    if (empty($url) || !is_string($url)) return '';
    $trimmed = trim($url);
    if ($trimmed === '') return '';
    if (!preg_match('~^(?:f|ht)tps?://~i', $trimmed) && !str_starts_with($trimmed, '#')) {
        $trimmed = 'https://' . $trimmed;
    }
    return filter_var($trimmed, FILTER_SANITIZE_URL) ?: $trimmed;
}

// Basic details
if (isset($payload['bakery_name'])) $current['bakery_name'] = trim((string)$payload['bakery_name']);
if (isset($payload['email'])) $current['email'] = trim((string)$payload['email']);
if (isset($payload['contact_number'])) $current['contact_number'] = trim((string)$payload['contact_number']);
if (isset($payload['address'])) $current['address'] = trim((string)$payload['address']);

// Social links
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

// Order settings
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
    if (isset($payload['order_settings']['delivery_fee'])) {
        $current['order_settings']['delivery_fee'] = max(0, (float)$payload['order_settings']['delivery_fee']);
    }
}

// Tax and VAT settings
if (isset($payload['tax_settings']) && is_array($payload['tax_settings'])) {
    if (!isset($current['tax_settings']) || !is_array($current['tax_settings'])) {
        $current['tax_settings'] = [];
    }
    if (isset($payload['tax_settings']['vat_enabled'])) {
        $current['tax_settings']['vat_enabled'] = (bool)$payload['tax_settings']['vat_enabled'];
    }
    if (isset($payload['tax_settings']['vat_rate'])) {
        $current['tax_settings']['vat_rate'] = max(0, min(100, (float)$payload['tax_settings']['vat_rate']));
    }
    if (isset($payload['tax_settings']['vat_type'])) {
        $type = strtolower(trim((string)$payload['tax_settings']['vat_type']));
        $current['tax_settings']['vat_type'] = in_array($type, ['exclusive', 'inclusive']) ? $type : 'exclusive';
    }
    if (isset($payload['tax_settings']['vat_tin'])) {
        $current['tax_settings']['vat_tin'] = trim((string)$payload['tax_settings']['vat_tin']);
    }
}

// Save into MySQL database
try {
    $stmt = $pdo->prepare("
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ('store_config', :val)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ");
    $stmt->execute(['val' => json_encode($current, JSON_UNESCAPED_SLASHES)]);

    sendResponse([
        'success'  => true,
        'message'  => 'Store settings updated successfully!',
        'settings' => $current
    ]);
} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Failed to save settings: ' . $e->getMessage()], 500);
}
?>
