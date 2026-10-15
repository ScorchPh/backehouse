<?php
// Save customizer builder options to database

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$data = getRequestBody();
if (empty($data) || !is_array($data)) {
    sendResponse(['success' => false, 'message' => 'Invalid or empty configuration data'], 400);
}

$pdo = getDBConnection();
if (!$pdo) {
    sendResponse(['success' => false, 'message' => 'Database connection failed'], 500);
}

$basePrice   = isset($data['base_price']) ? max(0, (float)$data['base_price']) : 700;
$advanceDays = isset($data['advance_days']) ? max(0, (int)$data['advance_days']) : 1;
$sizes       = is_array($data['sizes'] ?? null) ? $data['sizes'] : [];
$flavors     = is_array($data['flavors'] ?? null) ? $data['flavors'] : [];
$shapes      = is_array($data['shapes'] ?? null) ? $data['shapes'] : [];
$colors      = is_array($data['colors'] ?? null) ? $data['colors'] : [];
$occasions   = is_array($data['occasions'] ?? null) ? $data['occasions'] : [];

$optionsPayload = [
    'base_price'   => $basePrice,
    'advance_days' => $advanceDays,
    'sizes'        => $sizes,
    'flavors'      => $flavors,
    'shapes'       => $shapes,
    'colors'       => $colors,
    'occasions'    => $occasions,
    'updated_at'   => date('Y-m-d H:i:s')
];

try {
    $stmt = $pdo->prepare("
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES ('customizer_options', :val)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ");
    $stmt->execute(['val' => json_encode($optionsPayload, JSON_UNESCAPED_SLASHES)]);

    sendResponse([
        'success' => true,
        'message' => 'Cake customizer options saved successfully!',
        'options' => $optionsPayload
    ]);
} catch (PDOException $e) {
    sendResponse(['success' => false, 'message' => 'Failed to save customizer options: ' . $e->getMessage()], 500);
}
?>
