<?php
/**
 * ============================================================================
 * BAKE HOUSE - Submit Custom Cake Order API Endpoint
 * ============================================================================
 * Endpoint: POST /api/personalize/submit_custom_cake.php
 * Accepts: JSON payload { user_id, size, flavor, shape, color, occasion, message, instructions, price }
 *
 * PURPOSE:
 * Saves a customer's personalized cake design into the custom_cakes table (or JSON fallback).
 * Used when a customer designs a cake using the 3D / 2D interactive cake builder.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// STEP 1: Load Database Configuration & Helpers
// ----------------------------------------------------------------------------
require_once __DIR__ . '/../../config/db.php';


// ----------------------------------------------------------------------------
// STEP 2: Enforce HTTP Method Verification
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Use POST.'
    ], 405);
}


// ----------------------------------------------------------------------------
// STEP 3: Receive and Sanitize Custom Cake Specifications
// ----------------------------------------------------------------------------
$data = getRequestBody();

$userId       = isset($data['user_id']) ? (int)$data['user_id'] : null;
$size         = trim($data['size'] ?? '6 inches');
$flavor       = trim($data['flavor'] ?? 'Chocolate');
$shape        = trim($data['shape'] ?? 'Round');
$color        = trim($data['color'] ?? 'White');
$occasion     = trim($data['occasion'] ?? 'Birthday');
$message      = trim($data['message'] ?? '');
$instructions = trim($data['instructions'] ?? '');
$price        = (float)($data['price'] ?? 700.00);


// ----------------------------------------------------------------------------
// STEP 4: Save Custom Cake Record (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection
    // ------------------------------------------------------------------------
    try {
        $stmt = $pdo->prepare("
            INSERT INTO custom_cakes (user_id, size, flavor, shape, color, occasion, message, instructions, price, status)
            VALUES (:user_id, :size, :flavor, :shape, :color, :occasion, :message, :instructions, :price, 'Pending')
        ");
        $stmt->execute([
            'user_id'      => $userId ?: null,
            'size'         => $size,
            'flavor'       => $flavor,
            'shape'        => $shape,
            'color'        => $color,
            'occasion'     => $occasion,
            'message'      => $message,
            'instructions' => $instructions,
            'price'        => $price
        ]);

        $cakeId = (int)$pdo->lastInsertId();

    } catch (PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ], 500);
    }

} else {
    // ------------------------------------------------------------------------
    // CASE B: Offline / Fallback Mode (Using JSON file store)
    // ------------------------------------------------------------------------
    $cakes  = readDataStore('custom_cakes');
    $cakeId = count($cakes) > 0 ? max(array_column($cakes, 'id')) + 1 : 1;

    $newCake = [
        'id'           => $cakeId,
        'user_id'      => $userId,
        'size'         => $size,
        'flavor'       => $flavor,
        'shape'        => $shape,
        'color'        => $color,
        'occasion'     => $occasion,
        'message'      => $message,
        'instructions' => $instructions,
        'price'        => $price,
        'status'       => 'Pending',
        'created_at'   => date('Y-m-d H:i:s')
    ];

    $cakes[] = $newCake;
    writeDataStore('custom_cakes', $cakes);
}


// ----------------------------------------------------------------------------
// STEP 5: Return Success Response
// ----------------------------------------------------------------------------
sendResponse([
    'success'     => true,
    'message'     => 'Custom cake design submitted successfully!',
    'custom_cake' => [
        'id'           => $cakeId,
        'size'         => $size,
        'flavor'       => $flavor,
        'shape'        => $shape,
        'color'        => $color,
        'occasion'     => $occasion,
        'message'      => $message,
        'instructions' => $instructions,
        'price'        => $price,
        'status'       => 'Pending'
    ]
], 201);
?>
