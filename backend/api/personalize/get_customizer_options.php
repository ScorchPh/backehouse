<?php
/**
 * ============================================================================
 * BAKE HOUSE - Get Cake Customizer Options API Endpoint
 * Endpoint: GET /api/personalize/get_customizer_options.php
 * ============================================================================
 */

require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Method not allowed. Use GET.'], 405);
}

$options = readDataStore('customizer_options');

// If empty fallback, provide default options
if (empty($options) || !is_array($options)) {
    $options = [
        'base_price' => 700,
        'advance_days' => 1,
        'sizes' => [
            ['id' => 's1', 'name' => '6 inches', 'price_modifier' => 0, 'description' => 'Serves 4–6 persons', 'active' => true],
            ['id' => 's2', 'name' => '8 inches', 'price_modifier' => 150, 'description' => 'Serves 8–12 persons', 'active' => true],
            ['id' => 's3', 'name' => '10 inches', 'price_modifier' => 300, 'description' => 'Serves 15–20 persons', 'active' => true],
            ['id' => 's4', 'name' => '12 inches', 'price_modifier' => 500, 'description' => 'Serves 25–30 persons', 'active' => true],
            ['id' => 's5', 'name' => '2-Tier (6" + 8")', 'price_modifier' => 1200, 'description' => 'Serves 30–40 persons', 'active' => true],
        ],
        'flavors' => [
            ['id' => 'f1', 'name' => 'Chocolate', 'price_modifier' => 0, 'active' => true],
            ['id' => 'f2', 'name' => 'Vanilla', 'price_modifier' => 0, 'active' => true],
            ['id' => 'f3', 'name' => 'Red Velvet', 'price_modifier' => 50, 'active' => true],
            ['id' => 'f4', 'name' => 'Ube', 'price_modifier' => 50, 'active' => true],
            ['id' => 'f5', 'name' => 'Mocha', 'price_modifier' => 30, 'active' => true],
            ['id' => 'f6', 'name' => 'Matcha Green Tea', 'price_modifier' => 80, 'active' => true],
        ],
        'shapes' => [
            ['id' => 'sh1', 'name' => 'Round', 'price_modifier' => 0, 'active' => true],
            ['id' => 'sh2', 'name' => 'Square', 'price_modifier' => 50, 'active' => true],
            ['id' => 'sh3', 'name' => 'Heart', 'price_modifier' => 100, 'active' => true],
            ['id' => 'sh4', 'name' => 'Star', 'price_modifier' => 150, 'active' => true],
        ],
        'colors' => [
            ['id' => 'c1', 'name' => 'White', 'hex' => '#FFFFFF', 'border' => '#CCCCCC', 'active' => true],
            ['id' => 'c2', 'name' => 'Pink', 'hex' => '#FF69B4', 'active' => true],
            ['id' => 'c3', 'name' => 'Blue', 'hex' => '#3B82F6', 'active' => true],
            ['id' => 'c4', 'name' => 'Chocolate', 'hex' => '#54331D', 'active' => true],
            ['id' => 'c5', 'name' => 'Lavender', 'hex' => '#C084FC', 'active' => true],
            ['id' => 'c6', 'name' => 'Golden Yellow', 'hex' => '#FACC15', 'active' => true],
            ['id' => 'c7', 'name' => 'Mint Green', 'hex' => '#86EFAC', 'active' => true],
        ],
        'occasions' => [
            ['id' => 'o1', 'name' => 'Birthday', 'active' => true],
            ['id' => 'o2', 'name' => 'Wedding', 'active' => true],
            ['id' => 'o3', 'name' => 'Anniversary', 'active' => true],
            ['id' => 'o4', 'name' => 'Graduation', 'active' => true],
            ['id' => 'o5', 'name' => 'Baby Shower', 'active' => true],
            ['id' => 'o6', 'name' => 'Christening', 'active' => true],
            ['id' => 'o7', 'name' => 'Corporate Event', 'active' => true],
        ]
    ];
    writeDataStore('customizer_options', $options);
}

sendResponse([
    'success' => true,
    'options' => $options
], 200);
?>
