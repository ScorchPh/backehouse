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
define('DB_HOST', trim((string)(getenv('DB_HOST') ?: '127.0.0.1')));
define('DB_PORT', trim((string)(getenv('DB_PORT') ?: '3306')));
define('DB_NAME', trim((string)(getenv('DB_NAME') ?: 'bakehouse_db')));
define('DB_USER', trim((string)(getenv('DB_USER') ?: 'root')));
define('DB_PASS', getenv('DB_PASS') !== false ? trim((string)getenv('DB_PASS')) : 'NewStr0ngP@ss!');

// File Storage Data Directory (for zero-config fallback)
define('DATA_DIR', dirname(__DIR__) . '/database/data');

$GLOBALS['last_db_error'] = '';

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

    // Detect system CA bundle if available
    $caPath = '';
    if (file_exists('/etc/ssl/certs/ca-certificates.crt')) {
        $caPath = '/etc/ssl/certs/ca-certificates.crt';
    } elseif (file_exists('C:\\Windows\\System32\\curl-ca-bundle.crt')) {
        $caPath = 'C:\\Windows\\System32\\curl-ca-bundle.crt';
    }

    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        // Enable SSL/TLS for TiDB Cloud or cloud databases
        if (strpos(DB_HOST, 'tidbcloud.com') !== false || DB_PORT == 4000) {
            if (!empty($caPath)) {
                if (defined('Pdo\\Mysql::ATTR_SSL_CA')) {
                    $options[\Pdo\Mysql::ATTR_SSL_CA] = $caPath;
                } elseif (defined('PDO::MYSQL_ATTR_SSL_CA')) {
                    $options[\PDO::MYSQL_ATTR_SSL_CA] = $caPath;
                }
            }
            if (defined('Pdo\\Mysql::ATTR_SSL_VERIFY_SERVER_CERT')) {
                $options[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = false;
            } elseif (defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
                $options[\PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
            }
        }

        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (Exception $e) {
        $GLOBALS['last_db_error'] = $e->getMessage();
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
 * @param string $tableName
 * @return array
 */
function readDataStore(string $tableName): array {
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
 * @param string $tableName
 * @param mixed $data
 * @return void
 */
function writeDataStore(string $tableName, mixed $data): void {
    initDataStore();
    $path = DATA_DIR . '/' . $tableName . '.json';
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

/**
 * Helper to read JSON request body sent by fetch()
 * @return array
 */
function getRequestBody(): array {
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode($rawInput, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Helper to send formatted JSON responses
 * @param mixed $data
 * @param int $statusCode
 * @return void
 */
function sendResponse(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit();
}
?>
