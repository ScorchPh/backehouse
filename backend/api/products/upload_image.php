<?php
/**
 * ============================================================================
 * BAKE HOUSE - Product Image Upload Handler
 * ============================================================================
 * Endpoint: POST /api/products/upload_image.php
 * Format: multipart/form-data (Field: 'image')
 *
 * PURPOSE:
 * Handles binary image file uploads for bakery products. Performs security
 * checks (file size, allowed extensions), generates a unique filename, and saves
 * the file to the /uploads/productimg/ folder. Returns the web-accessible URL.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// STEP 1: Load CORS & Helper Functions
// ----------------------------------------------------------------------------
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';


// ----------------------------------------------------------------------------
// STEP 2: Enforce HTTP Method Verification
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse([
        'error' => 'Method not allowed. Only POST is accepted.'
    ], 405);
}


// ----------------------------------------------------------------------------
// STEP 3: Verify File Upload Status
// ----------------------------------------------------------------------------
// Check if the 'image' field was sent and that no PHP upload error occurred
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errCode = isset($_FILES['image']) ? $_FILES['image']['error'] : UPLOAD_ERR_NO_FILE;
    sendResponse([
        'error' => 'No file uploaded or upload error occurred. (Code: ' . $errCode . ')'
    ], 400);
}

$file = $_FILES['image'];


// ----------------------------------------------------------------------------
// STEP 4: Enforce File Size Limit (Max 10MB)
// ----------------------------------------------------------------------------
$maxSize = 10 * 1024 * 1024; // 10 Megabytes in bytes

if ($file['size'] > $maxSize) {
    sendResponse([
        'error' => 'File size exceeds maximum allowed 10MB limit.'
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 5: Validate File Extension (Whitelisting)
// ----------------------------------------------------------------------------
// Prevent malicious executable uploads (e.g. .php, .exe, .sh)
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'jfif', 'gif'];
$fileExtension     = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($fileExtension, $allowedExtensions)) {
    sendResponse([
        'error' => 'Invalid image format. Allowed formats: JPG, PNG, WEBP, JFIF, GIF.'
    ], 400);
}


// ----------------------------------------------------------------------------
// STEP 6: Prepare Upload Directory
// ----------------------------------------------------------------------------
$targetDirectory = __DIR__ . '/../../uploads/productimg/';

if (!file_exists($targetDirectory)) {
    // 0777 grants full permissions for Apache container writes
    mkdir($targetDirectory, 0777, true);
}


// ----------------------------------------------------------------------------
// STEP 7: Generate Unique Filename & Save
// ----------------------------------------------------------------------------
// We use timestamp + random bytes to avoid collisions or overwriting files
$uniqueName     = 'prod_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $fileExtension;
$targetFilePath = $targetDirectory . $uniqueName;

if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
    // Relative path for database storage and frontend image src
    $publicImageUrl = '/uploads/productimg/' . $uniqueName;

    sendResponse([
        'success'   => true,
        'message'   => 'Image uploaded successfully.',
        'image_url' => $publicImageUrl,
        'filename'  => $uniqueName
    ], 200);

} else {
    sendResponse([
        'error' => 'Failed to save uploaded file on server.'
    ], 500);
}
?>
