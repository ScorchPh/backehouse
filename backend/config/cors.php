<?php
// CORS (Cross-Origin Resource Sharing) Configuration
//
// Why this is needed:
// Browsers block requests by default when the frontend (React running on port 5173) 
// calls a backend running on a different port or domain (PHP on port 8000 or Apache).
// This is part of the browser's Same-Origin Policy.
//
// To allow React to communicate with our PHP backend, we must send these CORS headers:
// - Access-Control-Allow-Origin: allows requests from frontend origins
// - Access-Control-Allow-Methods: specifies allowed HTTP methods (GET, POST, PUT, DELETE)
// - Access-Control-Allow-Headers: allows Content-Type (needed for sending JSON) and Authorization
// - Access-Control-Max-Age: caches the preflight response for 24 hours so the browser doesn't send OPTIONS on every call

// Set Philippine timezone for order timestamps and logs
date_default_timezone_set('Asia/Manila');

// Ensure REQUEST_METHOD is defined when running through CLI or web server
if (!isset($_SERVER['REQUEST_METHOD'])) {
    $_SERVER['REQUEST_METHOD'] = 'GET';
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

// Handle browser preflight OPTIONS request
// Browsers send an OPTIONS request first before POST/PUT/DELETE to check if the server permits the call
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}
?>
