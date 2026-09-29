<?php
/**
 * ============================================================================
 * BAKE HOUSE - Create Product API Endpoint
 * ============================================================================
 * Endpoint: POST /api/products/create_product.php
 * Role: Admin / Staff management
 *
 * PURPOSE:
 * This script accepts new product details sent from the frontend Add Product
 * modal or admin dashboard, validates the data, and saves it into the database
 * (MySQL / TiDB Cloud, with an automatic fallback to local JSON file storage).
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// STEP 1: Load Database Configuration & Helper Functions
// ----------------------------------------------------------------------------
// db.php handles:
// - Cross-Origin Resource Sharing (CORS) headers so the React frontend can talk to PHP
// - getDBConnection() for connecting to MySQL / TiDB Cloud
// - getRequestBody() to parse incoming JSON payloads from fetch()
// - sendResponse() to output clean JSON with appropriate HTTP status codes
require_once __DIR__ . '/../../config/db.php';


// ----------------------------------------------------------------------------
// STEP 2: Security & Method Verification
// ----------------------------------------------------------------------------
// Only allow HTTP POST requests. If someone visits via browser address bar (GET)
// or tries another method, reject it with HTTP 405 (Method Not Allowed).
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse([
        'success' => false,
        'message' => 'Method not allowed. Please use POST to create a product.'
    ], 405);
}


// ----------------------------------------------------------------------------
// STEP 3: Receive and Parse Incoming JSON Data
// ----------------------------------------------------------------------------
// fetch() in React sends body as JSON string (Content-Type: application/json).
// getRequestBody() reads 'php://input' and decodes it into an associative PHP array.
$data = getRequestBody();


// ----------------------------------------------------------------------------
// STEP 4: Sanitize, Cast Types, and Apply Default Fallback Values
// ----------------------------------------------------------------------------
// We sanitize inputs to prevent whitespace errors and type-cast numbers so that
// invalid values don't break our SQL statements or calculations.
$name        = trim($data['name'] ?? '');
$description = trim($data['description'] ?? '');
$category    = trim($data['category'] ?? 'Cake');
$price       = (float)($data['price'] ?? 0.0);
$image       = trim($data['image'] ?? 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500');
$stock       = (int)($data['stock'] ?? 20);
$status      = trim($data['status'] ?? 'Available');
$bestseller  = !empty($data['bestseller']) ? 1 : 0; // Stored as 1 (true) or 0 (false) in SQL


// ----------------------------------------------------------------------------
// STEP 5: Validate Mandatory Fields
// ----------------------------------------------------------------------------
// A product cannot exist without a title and must have a positive price (> 0).
// If invalid, return HTTP 400 (Bad Request) and stop execution early.
if (empty($name) || $price <= 0) {
    sendResponse([
        'success' => false,
        'message' => 'Product name and a valid positive price are required.'
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 6: Save Product to Database (Primary: MySQL/TiDB | Fallback: JSON)
// ----------------------------------------------------------------------------
$pdo = getDBConnection();

if ($pdo) {
    // ------------------------------------------------------------------------
    // CASE A: Live MySQL / TiDB Cloud Connection is Available
    // ------------------------------------------------------------------------
    try {
        // Use PDO Prepared Statements with named placeholders (:name, :price, etc.)
        // This guarantees 100% protection against SQL Injection attacks.
        $stmt = $pdo->prepare("
            INSERT INTO products (name, description, category, price, image, stock, status, bestseller)
            VALUES (:name, :description, :category, :price, :image, :stock, :status, :bestseller)
        ");

        $stmt->execute([
            'name'        => $name,
            'description' => $description,
            'category'    => $category,
            'price'       => $price,
            'image'       => $image,
            'stock'       => $stock,
            'status'      => $status,
            'bestseller'  => $bestseller
        ]);

        // Retrieve the auto-incremented primary key assigned by MySQL
        $newId = (int)$pdo->lastInsertId();

    } catch (PDOException $e) {
        // Return HTTP 500 (Internal Server Error) if the SQL execution fails
        sendResponse([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ], 500);
    }

} else {
    // ------------------------------------------------------------------------
    // CASE B: Offline / Fallback Mode (Using JSON file storage)
    // ------------------------------------------------------------------------
    // Reads current products from backend/database/data/products.json
    $products = readDataStore('products');

    // Calculate the next ID (simulating AUTO_INCREMENT)
    $newId = count($products) > 0 ? max(array_column($products, 'id')) + 1 : 1;

    $newProduct = [
        'id'          => $newId,
        'name'        => $name,
        'description' => $description,
        'category'    => $category,
        'price'       => $price,
        'image'       => $image,
        'stock'       => $stock,
        'status'      => $status,
        'bestseller'  => (bool)$bestseller,
        'created_at'  => date('Y-m-d H:i:s')
    ];

    // Append new product to array and save back to the JSON file
    $products[] = $newProduct;
    writeDataStore('products', $products);
}


// ----------------------------------------------------------------------------
// STEP 7: Return Success Response to Frontend
// ----------------------------------------------------------------------------
// Return HTTP 201 (Created) along with the complete product object including its new ID.
sendResponse([
    'success' => true,
    'message' => "Product '{$name}' created successfully!",
    'product' => [
        'id'          => $newId,
        'name'        => $name,
        'description' => $description,
        'category'    => $category,
        'price'       => $price,
        'image'       => $image,
        'stock'       => $stock,
        'status'      => $status,
        'bestseller'  => (bool)$bestseller
    ]
], 201);
?>
