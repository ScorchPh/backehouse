<?php
/**
 * ============================================================================
 * BAKE HOUSE - Product Image Upload Handler
 * ============================================================================
 * Capstone Project Explanation:
 * Handles multipart/form-data file uploads for bakery product images.
 * Saves files to backend/uploads/productimg/ and returns the web-accessible URL.
 * ============================================================================
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['error' => 'Method not allowed. Only POST is accepted.'], 405);
}

// Ensure file was uploaded
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errCode = isset($_FILES['image']) ? $_FILES['image']['error'] : UPLOAD_ERR_NO_FILE;
    sendResponse(['error' => 'No file uploaded or upload error occurred. (Code: ' . $errCode . ')'], 400);
}

$file = $_FILES['image'];
$maxSize = 10 * 1024 * 1024; // 10MB limit

if ($file['size'] > $maxSize) {
    sendResponse(['error' => 'File size exceeds 10MB limit.'], 400);
}

// Validate file extension and MIME type
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'jfif', 'gif'];
$fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($fileExtension, $allowedExtensions)) {
    sendResponse(['error' => 'Invalid image format. Allowed: JPG, PNG, WEBP, JFIF, GIF.'], 400);
}

// Upload directory path
$targetDirectory = __DIR__ . '/../../uploads/productimg/';
if (!file_exists($targetDirectory)) {
    mkdir($targetDirectory, 0777, true);
}

// Generate unique, sanitized filename
$uniqueName = 'prod_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $fileExtension;
$targetFilePath = $targetDirectory . $uniqueName;

if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
    // Relative path for database storage and frontend rendering
    $publicImageUrl = '/uploads/productimg/' . $uniqueName;

    sendResponse([
        'success' => true,
        'message' => 'Image uploaded successfully.',
        'image_url' => $publicImageUrl,
        'filename' => $uniqueName
    ], 200);
} else {
    sendResponse(['error' => 'Failed to save uploaded file on server.'], 500);
}
