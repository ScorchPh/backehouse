-- BAKE HOUSE Database Schema and Seed Data
-- MySQL / MariaDB

DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `custom_cake_chats`;
DROP TABLE IF EXISTS `custom_cakes`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `store_settings`;

-- Users table
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `contact_number` VARCHAR(50) NULL,
    `password` VARCHAR(255) NULL,
    `role` ENUM('admin', 'staff', 'customer') NOT NULL DEFAULT 'customer',
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

-- Default user accounts (password: 1234)
INSERT INTO `users` (`id`, `username`, `first_name`, `last_name`, `email`, `contact_number`, `password`, `role`, `avatar`) VALUES
(1, 'admin', 'Store', 'Administrator', 'admin@bakehouse.com', '+63 912 345 6780', '$2y$12$D2OusZUJV7nQttmcIemNfOvoZ6g15cD3uFpzvbxkVjdkbA32E8gVC', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'),
(2, 'staff', 'Head', 'Baker', 'staff@bakehouse.com', '+63 912 345 6781', '$2y$12$D2OusZUJV7nQttmcIemNfOvoZ6g15cD3uFpzvbxkVjdkbA32E8gVC', 'staff', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'),
(3, 'customer', 'Juan', 'Dela Cruz', 'customer@bakehouse.com', '+63 912 345 6782', '$2y$12$D2OusZUJV7nQttmcIemNfOvoZ6g15cD3uFpzvbxkVjdkbA32E8gVC', 'customer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200');

-- Products catalog
CREATE TABLE `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'Cake',
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `image` VARCHAR(255) NULL,
    `stock` INT NOT NULL DEFAULT 10,
    `status` ENUM('Available', 'Low Stock', 'Out of Stock') NOT NULL DEFAULT 'Available',
    `bestseller` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `products` (`id`, `name`, `description`, `category`, `price`, `image`, `stock`, `status`, `bestseller`) VALUES
(1, 'Chocolate Cake', 'Rich chocolate sponge layered with creamy chocolate frosting.', 'Cake', 650.00, '/uploads/productimg/chocolate_cake.jpg', 15, 'Available', 1),
(2, 'Red Velvet Cake', 'Soft red velvet cake with smooth cream cheese frosting.', 'Cake', 720.00, '/uploads/productimg/red_velvet_cake.jpg', 8, 'Available', 1),
(3, 'Cheesecake', 'Classic New York style baked cheesecake with a buttery graham crust.', 'Cake', 680.00, '/uploads/productimg/cheesecake.jpg', 5, 'Low Stock', 0),
(4, 'Butter Croissant', 'Flaky, buttery French croissant baked golden fresh every morning.', 'Pastry', 85.00, '/uploads/productimg/butter_croissant.jpg', 25, 'Available', 1),
(5, 'Cinnamon Roll', 'Soft cinnamon-infused dough swirled with cream cheese glaze.', 'Pastry', 120.00, '/uploads/productimg/cinnamon_roll.jpg', 18, 'Available', 0),
(6, 'Blueberry Muffin', 'Moist bakery muffin bursting with fresh sweet blueberries.', 'Pastry', 95.00, '/uploads/productimg/blueberry_muffin.jpg', 20, 'Available', 0),
(7, 'Cheese Bread', 'Soft, warm artisan bread generously filled with melted cheddar cheese.', 'Bread', 45.00, '/uploads/productimg/cheese_bread.jpg', 30, 'Available', 0),
(8, 'Spanish Bread', 'Traditional Filipino sweet rolled bread with buttery sugar filling.', 'Bread', 30.00, '/uploads/productimg/spanish_bread.jpg', 40, 'Available', 0),
(9, 'Pandesal', 'Freshly baked Filipino breakfast bread rolls with breadcrumbs.', 'Bread', 25.00, '/uploads/productimg/pandesal.jpg', 50, 'Available', 0),
(10, 'Ube Cake', 'Authentic purple yam chiffon cake with luscious halaya cream.', 'Cake', 900.00, '/uploads/productimg/ube_cake.jpg', 0, 'Out of Stock', 0);

-- Orders table
CREATE TABLE `orders` (
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

INSERT INTO `orders` (`id`, `user_id`, `customer_name`, `customer_contact`, `delivery_address`, `payment_method`, `subtotal`, `delivery_fee`, `total`, `status`, `created_at`) VALUES
('BH-1008', 3, 'Juan Dela Cruz', '+63 912 345 6782', '123 Rizal St, Poblacion, Cordova, Cebu', 'Cash on Delivery', 850.00, 50.00, 900.00, 'Pending', '2026-08-30 22:45:24'),
('BH-1007', NULL, 'Maria Santos', '+63 917 888 1234', '45 Mango Ave, Cebu City', 'GCash', 1200.00, 50.00, 1250.00, 'For Delivery', '2026-08-30 00:45:24'),
('BH-1006', NULL, 'Angela Reyes', '+63 920 555 7890', '78 Banilad Rd, Mandaue City', 'Cash on Delivery', 750.00, 50.00, 800.00, 'Completed', '2026-08-29 00:45:24');

-- Line items for orders
CREATE TABLE `order_items` (
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

INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `price`, `quantity`, `customization`) VALUES
('BH-1008', 1, 'Chocolate Cake', 650.00, 1, NULL),
('BH-1008', 5, 'Cinnamon Roll', 120.00, 2, NULL),
('BH-1007', 2, 'Red Velvet Cake', 720.00, 1, NULL),
('BH-1006', 4, 'Butter Croissant', 85.00, 6, NULL);

-- Custom cake customization orders
CREATE TABLE `custom_cakes` (
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

-- Contact inquiries
CREATE TABLE `messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `messages` (`name`, `email`, `subject`, `message`) VALUES
('Ana Gomez', 'ana@example.com', 'Wedding Cake Inquiry', 'Hi! Do you accommodate 3-tier custom wedding cakes for November?');

-- Custom cake live consultation chat
CREATE TABLE `custom_cake_chats` (
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

INSERT INTO `custom_cake_chats` (`session_id`, `sender_name`, `sender_role`, `message`) VALUES
('demo_session_1', 'Juan Dela Cruz', 'customer', 'Hi! Can you do a 2-tier chocolate cake with fresh strawberries for Saturday?'),
('demo_session_1', 'Chef Baker', 'admin', 'Hello Juan! Yes, absolutely! Please select 2-Tier in the customizer and note strawberries in the special instructions.');

-- Store settings and configuration table
CREATE TABLE `store_settings` (
    `setting_key` VARCHAR(100) PRIMARY KEY,
    `setting_value` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `store_settings` (`setting_key`, `setting_value`) VALUES
('store_config', '{"bakery_name":"BAKE HOUSE","email":"info@bakehouse.com","contact_number":"0917-123-4567","address":"Poblacion, Cordova, Cebu, Philippines","social_links":{"facebook":"https://facebook.com","instagram":"https://instagram.com","tiktok":"https://tiktok.com"},"order_settings":{"accept_orders":true,"allow_customization":true,"delivery_fee":30},"tax_settings":{"vat_enabled":true,"vat_rate":12,"vat_type":"exclusive","vat_tin":"000-847-293-000"}}'),
('customizer_options', '{"base_price":700,"advance_days":1,"sizes":[{"id":"s1","name":"6 inches","price_modifier":0,"description":"Serves 4–6 persons","active":true},{"id":"s2","name":"8 inches","price_modifier":150,"description":"Serves 8–12 persons","active":true},{"id":"s3","name":"10 inches","price_modifier":300,"description":"Serves 15–20 persons","active":true},{"id":"s4","name":"12 inches","price_modifier":500,"description":"Serves 25–30 persons","active":true},{"id":"s5","name":"2-Tier (6\\" + 8\\")","price_modifier":1200,"description":"Serves 30–40 persons","active":true}],"flavors":[{"id":"f1","name":"Chocolate","price_modifier":0,"active":true},{"id":"f2","name":"Vanilla","price_modifier":0,"active":true},{"id":"f3","name":"Red Velvet","price_modifier":50,"active":true},{"id":"f4","name":"Ube","price_modifier":50,"active":true},{"id":"f5","name":"Mocha","price_modifier":30,"active":true},{"id":"f6","name":"Matcha Green Tea","price_modifier":80,"active":true}],"shapes":[{"id":"sh1","name":"Round","price_modifier":0,"active":true},{"id":"sh2","name":"Square","price_modifier":50,"active":true},{"id":"sh3","name":"Heart","price_modifier":100,"active":true},{"id":"sh4","name":"Star","price_modifier":150,"active":true}],"colors":[{"id":"c1","name":"White","hex":"#FFFFFF","border":"#CCCCCC","active":true},{"id":"c2","name":"Pink","hex":"#FF69B4","active":true},{"id":"c3","name":"Blue","hex":"#3B82F6","active":true},{"id":"c4","name":"Chocolate","hex":"#54331D","active":true},{"id":"c5","name":"Lavender","hex":"#C084FC","active":true},{"id":"c6","name":"Golden Yellow","hex":"#FACC15","active":true},{"id":"c7","name":"Mint Green","hex":"#86EFAC","active":true}],"occasions":[{"id":"o1","name":"Birthday","active":true},{"id":"o2","name":"Wedding","active":true},{"id":"o3","name":"Anniversary","active":true},{"id":"o4","name":"Graduation","active":true},{"id":"o5","name":"Baby Shower","active":true},{"id":"o6","name":"Christening","active":true},{"id":"o7","name":"Corporate Event","active":true}]}');
