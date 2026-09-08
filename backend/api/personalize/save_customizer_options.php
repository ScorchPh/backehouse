<?php
/**
 * ============================================================================
 * BAKE HOUSE - Save Cake Customizer Options API Endpoint
 * Endpoint: POST /api/personalize/save_customizer_options.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use POST.'], 405);
}

$data = getRequestBody();

if (empty($data) || !is_array($data)) {
    sendResponse(['success' => false, 'message' => 'Invalid or empty configuration payload.'], 400);
}

$basePrice = isset($data['base_price']) ? max(0, (float)$data['base_price']) : 700;
$advanceDays = isset($data['advance_days']) ? max(0, (int)$data['advance_days']) : 1;
$sizes = is_array($data['sizes'] ?? null) ? $data['sizes'] : [];
$flavors = is_array($data['flavors'] ?? null) ? $data['flavors'] : [];
$shapes = is_array($data['shapes'] ?? null) ? $data['shapes'] : [];
$colors = is_array($data['colors'] ?? null) ? $data['colors'] : [];
$occasions = is_array($data['occasions'] ?? null) ? $data['occasions'] : [];

$optionsPayload = [
    'base_price' => $basePrice,
    'advance_days' => $advanceDays,
    'sizes' => $sizes,
    'flavors' => $flavors,
    'shapes' => $shapes,
    'colors' => $colors,
    'occasions' => $occasions,
    'updated_at' => date('Y-m-d H:i:s')
];

writeDataStore('customizer_options', $optionsPayload);

sendResponse([
    'success' => true,
    'message' => 'Cake Customizer configuration saved successfully!',
    'options' => $optionsPayload
], 200);
?>
