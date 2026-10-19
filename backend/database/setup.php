<?php
// BAKE HOUSE - Database Setup & Seeder Script
//
// What this script does:
// 1. Connects to MySQL using PDO and creates the database if it doesn't exist yet.
// 2. Creates all required database tables with proper relational foreign keys.
// 3. Seeds the 3 default role accounts (Admin, Staff, Customer) with encrypted passwords.
// 4. Seeds the initial product catalog (Cakes, Pastries, Bread) with prices and stock.
// 5. Seeds demo orders and order items so the dashboard analytics and orders page show data immediately.
// 6. Seeds store settings and customizer options directly into the database.
//
// Usage:
// - Run directly in browser: http://localhost:8000/database/setup.php
// - Or reset all tables to fresh state: http://localhost:8000/database/setup.php?reset=1

header('Content-Type: text/html; charset=utf-8');
require_once __DIR__ . '/../config/db.php';

// Connect to MySQL server
$pdo = getDBConnection();
if (!$pdo) {
    $err = !empty($GLOBALS['last_db_error']) ? $GLOBALS['last_db_error'] : 'Unknown connection error';
    die("<h2>Database Connection Failed</h2><p>Could not connect to MySQL server on " . htmlspecialchars(DB_HOST) . ":" . htmlspecialchars(DB_PORT) . ".</p><p style='color:#c00;'><strong>Error Details:</strong> " . htmlspecialchars($err) . "</p>");
}

echo "<h1>🎂 BAKE HOUSE - Database Setup & Seeder</h1>";
echo "<p>Connected to MySQL server on " . DB_HOST . ":" . DB_PORT . " as <strong>" . DB_USER . "</strong>.</p>";

// Check if user requested a full reset via ?reset=1
$isReset = isset($_GET['reset']) && ($_GET['reset'] === '1' || $_GET['reset'] === 'true');

if ($isReset) {
    echo "<p style='color: #d9534f;'><strong>Reset Triggered:</strong> Dropping existing tables and rebuilding from scratch...</p>";
    // We disable foreign key checks temporarily so tables can be dropped in any order without foreign key constraint errors
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("DROP TABLE IF EXISTS `order_items`, `custom_cake_chats`, `custom_cakes`, `orders`, `messages`, `products`, `users`, `store_settings`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "<p>All existing tables dropped.</p>";
}

// Create database if it does not exist yet
try {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    $pdo->exec("USE `" . DB_NAME . "`;");
} catch (Exception $e) {
    // Some managed cloud databases (like TiDB/Aiven) manage the database creation on their dashboard
}

echo "<p>Database <strong>`" . DB_NAME . "`</strong> is ready.</p>";

$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

// Table 1: users
// Stores customer profiles, staff, and admin accounts.
// Includes address breakdown fields and GPS coordinates for delivery calculation.
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
    `default_street` VARCHAR(255) NULL,
    `default_barangay` VARCHAR(100) NULL,
    `default_city` VARCHAR(100) NULL,
    `default_province` VARCHAR(100) NULL,
    `default_landmark` VARCHAR(255) NULL,
    `default_lat` DECIMAL(10, 7) NULL,
    `default_lng` DECIMAL(10, 7) NULL,
    `address` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
// Ensure google_id exists if users table already existed
try {
    $colCheck = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'google_id'");
    if ($colCheck && $colCheck->rowCount() === 0) {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `google_id` VARCHAR(100) NULL UNIQUE AFTER `role`");
    }
} catch (Exception $e) {}
echo "<p>Table <strong>users</strong> created/verified.</p>";

// Table 2: products
// Bakery catalog containing standard items with prices, stock levels, and categories.
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "<p>Table <strong>products</strong> created/verified.</p>";

// Table 3: orders
// Stores customer order headers including fulfillment type, payment method, scheduling, and total cost.
// user_id links to users.id (NULL if guest or deleted user, using ON DELETE SET NULL).
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
    `cancellation_reason` TEXT NULL,
    `delivery_coordinates` JSON NULL,
    `fulfillment_type` VARCHAR(50) NULL DEFAULT 'Delivery',
    `distance_km` DECIMAL(6, 2) NULL,
    `estimated_delivery_time` VARCHAR(100) NULL,
    `scheduled_date` VARCHAR(50) NULL,
    `scheduled_time` VARCHAR(100) NULL,
    `is_scheduled` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "<p>Table <strong>orders</strong> created/verified.</p>";

// Table 4: order_items
// Line items belonging to an order.
// Foreign key to orders.id cascades on delete so removing an order removes its line items automatically.
$pdo->exec("
CREATE TABLE IF NOT EXISTS `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` VARCHAR(50) NOT NULL,
    `product_id` INT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `customization` JSON NULL,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "<p>Table <strong>order_items</strong> created/verified.</p>";

// Table 5: custom_cakes
// Stores custom cake designs created using the 2D/3D cake customizer.
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "<p>Table <strong>custom_cakes</strong> created/verified.</p>";

// Table 6: messages
// Customer inquiries and messages submitted via the Contact Us form.
$pdo->exec("
CREATE TABLE IF NOT EXISTS `messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "<p>Table <strong>messages</strong> created/verified.</p>";

// Table 7: custom_cake_chats
// Live chat consultation messages between customer and bakery staff regarding custom cake orders.
$pdo->exec("
CREATE TABLE IF NOT EXISTS `custom_cake_chats` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `session_id` VARCHAR(100) NOT NULL,
    `user_id` INT NULL,
    `sender_name` VARCHAR(100) NOT NULL,
    `sender_role` ENUM('customer', 'admin', 'staff') NOT NULL DEFAULT 'customer',
    `message` TEXT NOT NULL,
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "<p>Table <strong>custom_cake_chats</strong> created/verified.</p>";

// Table 8: store_settings
// Key-value configuration table storing store information, social links, tax/VAT rates,
// and cake customizer options directly in the database.
$pdo->exec("
CREATE TABLE IF NOT EXISTS `store_settings` (
    `setting_key` VARCHAR(100) PRIMARY KEY,
    `setting_value` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "<p>Table <strong>store_settings</strong> created/verified.</p>";

$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

// Seed Default User Accounts
// We hash passwords using bcrypt (cost 12) so real passwords are never stored in plaintext.
// Default password for all 3 demo accounts is '1234'.
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
echo "<p>Seeded 3 default user accounts: <strong>admin</strong>, <strong>staff</strong>, <strong>customer</strong> (password: <strong>1234</strong>).</p>";

// Seed Bakery Products Catalog
// Includes sample cakes, pastries, and bread with initial inventory counts.
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
    echo "<p>Seeded " . count($products) . " bakery catalog products.</p>";
} else {
    echo "<p>Products table already has data, skipping.</p>";
}

// Seed Initial Sample Orders
// Creates demo orders so the admin dashboard KPIs, charts, and customer order history show realistic data.
$stmtOrderCheck = $pdo->query("SELECT COUNT(*) FROM `orders`");
if ($stmtOrderCheck->fetchColumn() == 0) {
    $sampleOrders = [
        [
            'id' => 'BH-1008',
            'user_id' => 3,
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
    echo "<p>Seeded demo orders and line items.</p>";
}

// Seed Store Settings & Cake Customizer Configuration
// Saved directly into the store_settings table in the database.
$defaultStoreConfig = json_encode([
    'bakery_name'    => 'BAKE HOUSE',
    'email'          => 'info@bakehouse.com',
    'contact_number' => '0917-123-4567',
    'address'        => 'Poblacion, Cordova, Cebu, Philippines',
    'social_links'   => [
        'facebook'  => 'https://facebook.com',
        'instagram' => 'https://instagram.com',
        'tiktok'    => 'https://tiktok.com'
    ],
    'order_settings' => [
        'accept_orders'       => true,
        'allow_customization' => true,
        'delivery_fee'        => 30.00
    ],
    'tax_settings' => [
        'vat_enabled' => true,
        'vat_rate'    => 12.00,
        'vat_type'    => 'exclusive',
        'vat_tin'     => '000-847-293-000'
    ]
], JSON_UNESCAPED_SLASHES);

$defaultCustomizerConfig = json_encode([
    'base_price'   => 700,
    'advance_days' => 1,
    'sizes' => [
        ['id' => 's1', 'name' => '6 inches', 'price_modifier' => 0, 'description' => 'Serves 4–6 persons', 'active' => true],
        ['id' => 's2', 'name' => '8 inches', 'price_modifier' => 150, 'description' => 'Serves 8–12 persons', 'active' => true],
        ['id' => 's3', 'name' => '10 inches', 'price_modifier' => 300, 'description' => 'Serves 15–20 persons', 'active' => true],
        ['id' => 's4', 'name' => '12 inches', 'price_modifier' => 500, 'description' => 'Serves 25–30 persons', 'active' => true],
        ['id' => 's5', 'name' => '2-Tier (6" + 8")', 'price_modifier' => 1200, 'description' => 'Serves 30–40 persons', 'active' => true]
    ],
    'flavors' => [
        ['id' => 'f1', 'name' => 'Chocolate', 'price_modifier' => 0, 'active' => true],
        ['id' => 'f2', 'name' => 'Vanilla', 'price_modifier' => 0, 'active' => true],
        ['id' => 'f3', 'name' => 'Red Velvet', 'price_modifier' => 50, 'active' => true],
        ['id' => 'f4', 'name' => 'Ube', 'price_modifier' => 50, 'active' => true],
        ['id' => 'f5', 'name' => 'Mocha', 'price_modifier' => 30, 'active' => true],
        ['id' => 'f6', 'name' => 'Matcha Green Tea', 'price_modifier' => 80, 'active' => true]
    ],
    'shapes' => [
        ['id' => 'sh1', 'name' => 'Round', 'price_modifier' => 0, 'active' => true],
        ['id' => 'sh2', 'name' => 'Square', 'price_modifier' => 50, 'active' => true],
        ['id' => 'sh3', 'name' => 'Heart', 'price_modifier' => 100, 'active' => true],
        ['id' => 'sh4', 'name' => 'Star', 'price_modifier' => 150, 'active' => true]
    ],
    'colors' => [
        ['id' => 'c1', 'name' => 'White', 'hex' => '#FFFFFF', 'border' => '#CCCCCC', 'active' => true],
        ['id' => 'c2', 'name' => 'Pink', 'hex' => '#FF69B4', 'active' => true],
        ['id' => 'c3', 'name' => 'Blue', 'hex' => '#3B82F6', 'active' => true],
        ['id' => 'c4', 'name' => 'Chocolate', 'hex' => '#54331D', 'active' => true],
        ['id' => 'c5', 'name' => 'Lavender', 'hex' => '#C084FC', 'active' => true],
        ['id' => 'c6', 'name' => 'Golden Yellow', 'hex' => '#FACC15', 'active' => true],
        ['id' => 'c7', 'name' => 'Mint Green', 'hex' => '#86EFAC', 'active' => true]
    ],
    'occasions' => [
        ['id' => 'o1', 'name' => 'Birthday', 'active' => true],
        ['id' => 'o2', 'name' => 'Wedding', 'active' => true],
        ['id' => 'o3', 'name' => 'Anniversary', 'active' => true],
        ['id' => 'o4', 'name' => 'Graduation', 'active' => true],
        ['id' => 'o5', 'name' => 'Baby Shower', 'active' => true],
        ['id' => 'o6', 'name' => 'Christening', 'active' => true],
        ['id' => 'o7', 'name' => 'Corporate Event', 'active' => true]
    ]
], JSON_UNESCAPED_SLASHES);

$stmtSettings = $pdo->prepare("
    INSERT INTO `store_settings` (`setting_key`, `setting_value`)
    VALUES (:key, :val)
    ON DUPLICATE KEY UPDATE `setting_value` = IF(`setting_value` IS NULL OR `setting_value` = '', VALUES(`setting_value`), `setting_value`)
");

$stmtSettings->execute(['key' => 'store_config', 'val' => $defaultStoreConfig]);
$stmtSettings->execute(['key' => 'customizer_options', 'val' => $defaultCustomizerConfig]);
echo "<p>Store settings and customizer options ready in database.</p>";

echo "<h3>🎉 Database setup completed successfully!</h3>";
echo "<p>The database tables and seed data are ready for the application.</p>";
echo "<hr style='margin: 20px 0;'>";
echo "<p><a href='?reset=1' style='display:inline-block; background:#d9534f; color:#fff; padding:10px 18px; text-decoration:none; border-radius:6px; font-weight:bold;' onclick='return confirm(\"⚠️ Are you sure you want to wipe and restart all tables back to default?\");'>🔄 Restart / Reset Database to Fresh State</a></p>";
?>
