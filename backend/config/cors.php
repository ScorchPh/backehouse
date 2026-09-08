<?php
/**
 * ============================================================================
 * BAKE HOUSE - Cross-Origin Resource Sharing (CORS) Middleware
 * ============================================================================
 * Capstone Project Explanation:
 * Browsers enforce the Same-Origin Policy for security. When our React frontend
 * (e.g. running on http://localhost:5173) makes HTTP requests to our PHP API
 * (e.g. running on http://localhost:8000), the browser sends preflight OPTIONS
 * requests and checks CORS headers.
 * 
 * This file sets the required response headers to allow seamless API communication.
 * ============================================================================
 */

// Allow requests from any origin during development (or specify frontend URL)
header("Access-Control-Allow-Origin: *");

// Specify allowed HTTP methods for REST API operations
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

// Specify allowed headers sent by client (e.g. Content-Type for JSON payloads)
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Set default response Content-Type to JSON for API responses
header("Content-Type: application/json; charset=UTF-8");

// Handle HTTP preflight OPTIONS requests immediately
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
