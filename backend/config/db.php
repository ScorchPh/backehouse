<?php
// Database Connection & Global API Helpers
//
// This file handles:
// 1. Loading environment variables from .env files so database credentials aren't hardcoded.
// 2. Connecting to MySQL using PDO prepared statements (Singleton pattern to reuse connection).
// 3. getRequestBody(): Reading JSON payloads sent by React's fetch() API.
// 4. sendResponse(): Standardizing JSON responses with proper HTTP status codes.

require_once __DIR__ . '/cors.php';

// Reads key-value pairs from a .env file and sets them into getenv(), $_ENV, and $_SERVER.
// This allows the system to read local configuration without needing third-party Composer packages.
function loadEnvFile(string $path): void {
    if (!file_exists($path) || !is_readable($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (str_contains($line, '=')) {
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Remove surrounding single or double quotes
            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

// Load backend/.env and optional local override backend/.env.local
loadEnvFile(dirname(__DIR__) . '/.env');
loadEnvFile(dirname(__DIR__) . '/.env.local');

// Database configuration constants (read from environment or default to local development values)
define('DB_HOST', trim((string)(getenv('DB_HOST') ?: '127.0.0.1')));
define('DB_PORT', trim((string)(getenv('DB_PORT') ?: '3306')));
define('DB_NAME', trim((string)(getenv('DB_NAME') ?: 'bakehouse_db')));
define('DB_USER', trim((string)(getenv('DB_USER') ?: 'root')));
define('DB_PASS', getenv('DB_PASS') !== false ? (string)getenv('DB_PASS') : 'NewStr0ngP@ss!');
define('GOOGLE_CLIENT_ID', trim((string)(getenv('GOOGLE_CLIENT_ID') ?: '')));

$GLOBALS['last_db_error'] = '';

// Establishes a PDO MySQL database connection.
// We use a static variable ($pdo) so that multiple calls to getDBConnection() in the same
// request reuse the existing connection instead of creating unnecessary multiple connections.
function getDBConnection() {
    static $pdo = null;
    static $attempted = false;

    if ($attempted) {
        return $pdo;
    }

    $attempted = true;

    // Detect system CA bundle if connecting to a cloud database requiring SSL
    $caPath = '';
    if (file_exists('/etc/ssl/certs/ca-certificates.crt')) {
        $caPath = '/etc/ssl/certs/ca-certificates.crt';
    } elseif (file_exists('C:\\Windows\\System32\\curl-ca-bundle.crt')) {
        $caPath = 'C:\\Windows\\System32\\curl-ca-bundle.crt';
    }

    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors so we can catch and handle them
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, // Return rows as associative arrays
            PDO::ATTR_EMULATE_PREPARES => true, // Use native prepared statements for security against SQL injection
        ];

        // Enable SSL/TLS options if connecting to TiDB Cloud or custom cloud ports
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
        
        // Ensure database session timezone matches Philippine time
        try {
            $pdo->exec("SET time_zone = '+08:00'");
        } catch (Exception $e) {}

        return $pdo;
    } catch (Exception $e) {
        $GLOBALS['last_db_error'] = $e->getMessage();
        return null;
    }
}

// Reads incoming JSON payload sent by JavaScript fetch().
// By default, PHP's $_POST is only populated for multipart/form-data or application/x-www-form-urlencoded.
// Modern frontend apps send application/json, so we read the raw request stream php://input.
function getRequestBody(): array {
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode($rawInput, true);
    return is_array($decoded) ? $decoded : [];
}

// Alias for getRequestBody to prevent unexpected token errors
function getJsonPayload(): array {
    return getRequestBody();
}

// Sends a structured JSON response to the client with an HTTP status code,
// then terminates script execution cleanly.
function sendResponse(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit();
}
?>
