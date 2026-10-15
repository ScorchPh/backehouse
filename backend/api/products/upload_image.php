<?php
// Product image upload handler

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['error' => 'Method not allowed. Use POST.'], 405);
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errCode = isset($_FILES['image']) ? $_FILES['image']['error'] : UPLOAD_ERR_NO_FILE;
    sendResponse(['error' => 'No file uploaded or upload error occurred. (Code: ' . $errCode . ')'], 400);
}

$file = $_FILES['image'];

// Max size 10MB
$maxSize = 10 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    sendResponse(['error' => 'File size exceeds maximum 10MB limit.'], 400);
}

// Validate extension
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'jfif', 'gif'];
$fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($fileExtension, $allowedExtensions)) {
    sendResponse(['error' => 'Invalid image format. Allowed formats: JPG, PNG, WEBP, JFIF, GIF.'], 400);
}

$targetDirectory = __DIR__ . '/../../uploads/productimg/';
if (!file_exists($targetDirectory)) {
    mkdir($targetDirectory, 0777, true);
}

// Generate unique filename
$uniqueName = 'prod_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $fileExtension;
$targetFilePath = $targetDirectory . $uniqueName;

if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
    $publicImageUrl = '/uploads/productimg/' . $uniqueName;

    sendResponse([
        'success'   => true,
        'message'   => 'Image uploaded successfully.',
        'image_url' => $publicImageUrl,
        'filename'  => $uniqueName
    ], 200);
} else {
    sendResponse(['error' => 'Failed to save uploaded image.'], 500);
}
?>
