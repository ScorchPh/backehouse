<?php
/**
 * ============================================================================
 * BAKE HOUSE - Automated Database Setup & Demo Data Seeder
 * ============================================================================
 * Capstone Project Explanation:
 * This script automates database creation and data seeding.
 * It connects to MySQL, creates `bakehouse_db`, builds all tables, and seeds:
 * 1. The 3 requested role accounts (Admin, Staff, Customer with password '1234').
 * 2. Bakery products catalog with prices, stock, and categories.
 * 3. Initial sample orders for dashboard stats.
 * ============================================================================
 */

header('Content-Type: text/html; charset=utf-8');
require_once __DIR__ . '/../config/db.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false
    ]);
} catch (PDOException $e) {
    die("<h2>Database Connection Failed</h2><p>Could not connect to MySQL server: " . htmlspecialchars($e->getMessage()) . "</p>");
}

echo "<h1>🎂 BAKE HOUSE - Database Setup & Seeder</h1>";
echo "<p>Connected to MySQL server on " . DB_HOST . ":" . DB_PORT . " as <strong>" . DB_USER . "</strong>.</p>";

$isReset = isset($_GET['reset']) && ($_GET['reset'] === '1' || $_GET['reset'] === 'true');

if ($isReset) {
    echo "<p style='color: #d9534f;'>⚠️ <strong>Reset Triggered:</strong> Wiping all existing tables and records...</p>";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("DROP TABLE IF EXISTS `order_items`, `orders`, `custom_cakes`, `messages`, `products`, `users`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "<p>🗑️ Existing records cleared.</p>";
}

// 1. Verify Database
try {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    $pdo->exec("USE `" . DB_NAME . "`;");
} catch (Exception $e) {
    // Managed cloud databases like Aiven defaultdb don't allow CREATE DATABASE
}
echo "<p>✅ Database <strong>`" . DB_NAME . "`</strong> ready.</p>";

// 2. Create Users Table
$pdo->exec("
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `contact_number` VARCHAR(50) NULL,
    `password` VARCHAR(255) NULL,
    `role` ENUM('customer', 'staff', 'admin') NOT NULL DEFAULT 'customer',
    `google_id` VARCHAR(100) NULL UNIQUE,
    `avatar` VARCHAR(500) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
echo "<p>✅ Table <strong>users</strong> created.</p>";

// 3. Create Products Table
$pdo->exec("
CREATE TABLE IF NOT EXISTS `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(50) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `image` VARCHAR(500) NULL,
    `stock` INT NOT NULL DEFAULT 20,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Available',
    `bestseller` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
echo "<p>✅ Table <strong>products</strong> created.</p>";

// 4. Create Orders Table
$pdo->exec("
CREATE TABLE IF NOT EXISTS `orders` (
    `id` VARCHAR(50) PRIMARY KEY,
    `user_id` INT NULL,
    `customer_name` VARCHAR(200) NOT NULL,
    `customer_contact` VARCHAR(50) NOT NULL,
    `delivery_address` TEXT NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `delivery_fee` DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    `total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
echo "<p>✅ Table <strong>orders</strong> created.</p>";

// 5. Create Order Items Table
$pdo->exec("
CREATE TABLE IF NOT EXISTS `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` VARCHAR(50) NOT NULL,
    `product_id` INT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `customization` JSON NULL,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
echo "<p>✅ Table <strong>order_items</strong> created.</p>";

// 6. Create Custom Cakes Table
$pdo->exec("
CREATE TABLE IF NOT EXISTS `custom_cakes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `size` VARCHAR(50) NOT NULL,
    `flavor` VARCHAR(50) NOT NULL,
    `shape` VARCHAR(50) NOT NULL,
    `color` VARCHAR(50) NOT NULL,
    `occasion` VARCHAR(50) NOT NULL,
    `message` VARCHAR(255) NULL,
    `instructions` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 700.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
echo "<p>✅ Table <strong>custom_cakes</strong> created.</p>";

// 7. Create Messages Table
$pdo->exec("
CREATE TABLE IF NOT EXISTS `messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");
echo "<p>✅ Table <strong>messages</strong> created.</p>";

// ----------------------------------------------------------------------------
// SEED USERS (Admin, Staff, Customer with password '1234')
// ----------------------------------------------------------------------------
$hashedPassword = password_hash('1234', PASSWORD_BCRYPT);

$users = [
    [
        'username' => 'admin',
        'first_name' => 'Store',
        'last_name' => 'Administrator',
        'email' => 'admin@bakehouse.com',
        'contact_number' => '+63 912 345 6780',
        'password' => $hashedPassword,
        'role' => 'admin'
    ],
    [
        'username' => 'staff',
        'first_name' => 'Head',
        'last_name' => 'Baker',
        'email' => 'staff@bakehouse.com',
        'contact_number' => '+63 912 345 6781',
        'password' => $hashedPassword,
        'role' => 'staff'
    ],
    [
        'username' => 'customer',
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
        'email' => 'customer@bakehouse.com',
        'contact_number' => '+63 912 345 6782',
        'password' => $hashedPassword,
        'role' => 'customer'
    ]
];

$stmtUser = $pdo->prepare("
    INSERT INTO `users` (`username`, `first_name`, `last_name`, `email`, `contact_number`, `password`, `role`)
    VALUES (:username, :first_name, :last_name, :email, :contact_number, :password, :role)
    ON DUPLICATE KEY UPDATE 
        `password` = VALUES(`password`),
        `role` = VALUES(`role`),
        `first_name` = VALUES(`first_name`),
        `last_name` = VALUES(`last_name`);
");

foreach ($users as $u) {
    $stmtUser->execute($u);
}
echo "<p>✅ Seeded 3 default accounts: <strong>admin</strong> (password: 1234), <strong>staff</strong> (password: 1234), <strong>customer</strong> (password: 1234).</p>";

// ----------------------------------------------------------------------------
// SEED PRODUCTS
// ----------------------------------------------------------------------------
$products = [
    [
        'name' => 'Chocolate Cake',
        'description' => 'Rich chocolate sponge layered with creamy chocolate frosting.',
        'category' => 'Cake',
        'price' => 650.00,
        'image' => '/uploads/productimg/chocolate_cake.jpg',
        'stock' => 15,
        'status' => 'Available',
        'bestseller' => 1
    ],
    [
        'name' => 'Red Velvet Cake',
        'description' => 'Soft red velvet cake with smooth cream cheese frosting.',
        'category' => 'Cake',
        'price' => 720.00,
        'image' => '/uploads/productimg/red_velvet_cake.jpg',
        'stock' => 8,
        'status' => 'Available',
        'bestseller' => 1
    ],
    [
        'name' => 'Cheesecake',
        'description' => 'Classic New York style baked cheesecake with a buttery graham crust.',
        'category' => 'Cake',
        'price' => 680.00,
        'image' => '/uploads/productimg/cheesecake.jpg',
        'stock' => 5,
        'status' => 'Low Stock',
        'bestseller' => 0
    ],
    [
        'name' => 'Butter Croissant',
        'description' => 'Flaky, buttery French croissant baked golden fresh every morning.',
        'category' => 'Pastry',
        'price' => 85.00,
        'image' => '/uploads/productimg/butter_croissant.jpg',
        'stock' => 25,
        'status' => 'Available',
        'bestseller' => 1
    ],
    [
        'name' => 'Cinnamon Roll',
        'description' => 'Soft cinnamon-infused dough swirled with cream cheese glaze.',
        'category' => 'Pastry',
        'price' => 120.00,
        'image' => '/uploads/productimg/cinnamon_roll.jpg',
        'stock' => 18,
        'status' => 'Available',
        'bestseller' => 0
    ],
    [
        'name' => 'Blueberry Muffin',
        'description' => 'Moist bakery muffin bursting with fresh sweet blueberries.',
        'category' => 'Pastry',
        'price' => 95.00,
        'image' => '/uploads/productimg/blueberry_muffin.jpg',
        'stock' => 20,
        'status' => 'Available',
        'bestseller' => 0
    ],
    [
        'name' => 'Cheese Bread',
        'description' => 'Soft, warm artisan bread generously filled with melted cheddar cheese.',
        'category' => 'Bread',
        'price' => 45.00,
        'image' => '/uploads/productimg/cheese_bread.jpg',
        'stock' => 30,
        'status' => 'Available',
        'bestseller' => 0
    ],
    [
        'name' => 'Spanish Bread',
        'description' => 'Traditional Filipino sweet rolled bread with buttery sugar filling.',
        'category' => 'Bread',
        'price' => 30.00,
        'image' => '/uploads/productimg/spanish_bread.jpg',
        'stock' => 40,
        'status' => 'Available',
        'bestseller' => 0
    ],
    [
        'name' => 'Pandesal',
        'description' => 'Freshly baked Filipino breakfast bread rolls with breadcrumbs.',
        'category' => 'Bread',
        'price' => 25.00,
        'image' => '/uploads/productimg/pandesal.jpg',
        'stock' => 50,
        'status' => 'Available',
        'bestseller' => 0
    ],
    [
        'name' => 'Ube Cake',
        'description' => 'Authentic purple yam chiffon cake with luscious halaya cream.',
        'category' => 'Cake',
        'price' => 900.00,
        'image' => '/uploads/productimg/ube_cake.jpg',
        'stock' => 0,
        'status' => 'Out of Stock',
        'bestseller' => 0
    ]
];

$stmtProdCheck = $pdo->query("SELECT COUNT(*) FROM `products`");
if ($stmtProdCheck->fetchColumn() == 0) {
    $stmtProd = $pdo->prepare("
        INSERT INTO `products` (`name`, `description`, `category`, `price`, `image`, `stock`, `status`, `bestseller`)
        VALUES (:name, :description, :category, :price, :image, :stock, :status, :bestseller)
    ");
    foreach ($products as $p) {
        $stmtProd->execute($p);
    }
    echo "<p>✅ Seeded " . count($products) . " bakery products.</p>";
} else {
    echo "<p>ℹ️ Products table already has data, skipping product re-seed.</p>";
}

// ----------------------------------------------------------------------------
// SEED INITIAL ORDERS (For Dashboard and My Orders demo)
// ----------------------------------------------------------------------------
$stmtOrderCheck = $pdo->query("SELECT COUNT(*) FROM `orders`");
if ($stmtOrderCheck->fetchColumn() == 0) {
    $sampleOrders = [
        [
            'id' => 'BH-1008',
            'user_id' => 3, // customer
            'customer_name' => 'Juan Dela Cruz',
            'customer_contact' => '+63 912 345 6782',
            'delivery_address' => '123 Rizal St, Poblacion, Cordova, Cebu',
            'payment_method' => 'Cash on Delivery',
            'subtotal' => 850.00,
            'delivery_fee' => 50.00,
            'total' => 900.00,
            'status' => 'Preparing'
        ],
        [
            'id' => 'BH-1007',
            'user_id' => null,
            'customer_name' => 'Maria Santos',
            'customer_contact' => '+63 917 888 1234',
            'delivery_address' => '45 Mango Ave, Cebu City',
            'payment_method' => 'GCash',
            'subtotal' => 1200.00,
            'delivery_fee' => 50.00,
            'total' => 1250.00,
            'status' => 'For Delivery'
        ],
        [
            'id' => 'BH-1006',
            'user_id' => null,
            'customer_name' => 'Angela Reyes',
            'customer_contact' => '+63 920 555 7890',
            'delivery_address' => '78 Banilad Rd, Mandaue City',
            'payment_method' => 'Cash on Delivery',
            'subtotal' => 750.00,
            'delivery_fee' => 50.00,
            'total' => 800.00,
            'status' => 'Completed'
        ]
    ];

    $stmtOrder = $pdo->prepare("
        INSERT INTO `orders` (`id`, `user_id`, `customer_name`, `customer_contact`, `delivery_address`, `payment_method`, `subtotal`, `delivery_fee`, `total`, `status`)
        VALUES (:id, :user_id, :customer_name, :customer_contact, :delivery_address, :payment_method, :subtotal, :delivery_fee, :total, :status)
    ");

    $stmtItem = $pdo->prepare("
        INSERT INTO `order_items` (`order_id`, `product_name`, `price`, `quantity`)
        VALUES (:order_id, :product_name, :price, :quantity)
    ");

    foreach ($sampleOrders as $ord) {
        $stmtOrder->execute($ord);
        $stmtItem->execute([
            'order_id' => $ord['id'],
            'product_name' => 'Chocolate Cake',
            'price' => $ord['subtotal'],
            'quantity' => 1
        ]);
    }
    echo "<p>✅ Seeded demo orders.</p>";
}

echo "<h3>🎉 Database Setup Completed Successfully!</h3>";
echo "<p>You can now test the API and frontend!</p>";
echo "<hr style='margin: 20px 0;'>";
echo "<p><a href='?reset=1' style='display:inline-block; background:#d9534f; color:#fff; padding:10px 18px; text-decoration:none; border-radius:6px; font-weight:bold;' onclick='return confirm(\"⚠️ Are you sure you want to WIPE and RESTART all database records back to default?\");'>🔄 Restart / Reset Database to Fresh State</a></p>";
?>
