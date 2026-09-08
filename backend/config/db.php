<?php
/**
 * ============================================================================
 * BAKE HOUSE - Database Connection & Abstraction Layer
 * ============================================================================
 * Capstone Project Architecture:
 * 1. Primary Engine: MySQL Database (PDO Prepared Statements)
 * 2. Fallback Engine: JSON Data Store (`backend/database/data/`)
 * ============================================================================
 */

require_once __DIR__ . '/cors.php';

// MySQL Configuration Settings (reads from cloud environment or defaults to local)
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'bakehouse_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'NewStr0ngP@ss!');

// File Storage Data Directory (for zero-config fallback)
define('DATA_DIR', dirname(__DIR__) . '/database/data');

/**
 * Connects to MySQL using PDO Prepared Statements
 * @return PDO|null
 */
function getDBConnection() {
    static $pdo = null;
    static $attempted = false;

    if ($attempted) {
        return $pdo;
    }

    $attempted = true;

    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        return $pdo;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Ensures data directory and JSON store files exist with seed data
 */
function initDataStore() {
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0777, true);
    }
}

/**
 * Reads a JSON file data store
 */
function readDataStore($tableName) {
    initDataStore();
    $path = DATA_DIR . '/' . $tableName . '.json';
    if (!file_exists($path)) {
        return [];
    }
    $content = file_get_contents($path);
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Writes data into JSON file data store
 */
function writeDataStore($tableName, $data) {
    initDataStore();
    $path = DATA_DIR . '/' . $tableName . '.json';
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

/**
 * Helper to read JSON request body sent by fetch()
 */
function getRequestBody() {
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode($rawInput, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Helper to send formatted JSON responses
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit();
}
?>
