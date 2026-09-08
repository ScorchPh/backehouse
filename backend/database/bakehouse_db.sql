-- ============================================================================
-- BAKE HOUSE - Complete MySQL Database Schema & Seed Data
-- ============================================================================
-- Project: Bake House Online Bakery & Custom Cake Management System
-- To import in MySQL Workbench:
-- 1. Open MySQL Workbench
-- 2. Click File -> Open SQL Script -> Select this bakehouse_db.sql file
-- 3. Click the ⚡ Execute button (or press Ctrl + Shift + Enter)
-- 4. Right-click the SCHEMAS panel on the left and click "Refresh All"
-- ============================================================================



-- ----------------------------------------------------------------------------
-- 1. Table structure for table `users`
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `custom_cakes`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `contact_number` VARCHAR(50) NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'staff', 'customer') NOT NULL DEFAULT 'customer',
    `avatar` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Dumping data for table `users` (Password: 1234 for all accounts)
-- ----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `username`, `first_name`, `last_name`, `email`, `contact_number`, `password`, `role`, `avatar`) VALUES
(1, 'admin', 'Store', 'Administrator', 'admin@bakehouse.com', '+63 912 345 6780', '$2y$10$w09Zk6Z8uG.U1zXUfLqPwe0VpWq0Fz/R77Vj7BwP6qXpG3Z3vA3ry', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'),
(2, 'staff', 'Head', 'Baker', 'staff@bakehouse.com', '+63 912 345 6781', '$2y$10$w09Zk6Z8uG.U1zXUfLqPwe0VpWq0Fz/R77Vj7BwP6qXpG3Z3vA3ry', 'staff', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'),
(3, 'customer', 'Juan', 'Dela Cruz', 'customer@bakehouse.com', '+63 912 345 6782', '$2y$10$w09Zk6Z8uG.U1zXUfLqPwe0VpWq0Fz/R77Vj7BwP6qXpG3Z3vA3ry', 'customer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200');

-- ----------------------------------------------------------------------------
-- 2. Table structure for table `products`
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Dumping data for table `products`
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. Table structure for table `orders`
-- ----------------------------------------------------------------------------
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
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Dumping data for table `orders`
-- ----------------------------------------------------------------------------
INSERT INTO `orders` (`id`, `user_id`, `customer_name`, `customer_contact`, `delivery_address`, `payment_method`, `subtotal`, `delivery_fee`, `total`, `status`, `created_at`) VALUES
('BH-1008', 3, 'Juan Dela Cruz', '+63 912 345 6782', '123 Rizal St, Poblacion, Cordova, Cebu', 'Cash on Delivery', 850.00, 50.00, 900.00, 'Pending', '2026-08-30 22:45:24'),
('BH-1007', NULL, 'Maria Santos', '+63 917 888 1234', '45 Mango Ave, Cebu City', 'GCash', 1200.00, 50.00, 1250.00, 'For Delivery', '2026-08-30 00:45:24'),
('BH-1006', NULL, 'Angela Reyes', '+63 920 555 7890', '78 Banilad Rd, Mandaue City', 'Cash on Delivery', 750.00, 50.00, 800.00, 'Completed', '2026-08-29 00:45:24');

-- ----------------------------------------------------------------------------
-- 4. Table structure for table `order_items`
-- ----------------------------------------------------------------------------
CREATE TABLE `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` VARCHAR(50) NOT NULL,
    `product_id` INT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `customization` JSON NULL,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `price`, `quantity`, `customization`) VALUES
('BH-1008', 1, 'Chocolate Cake', 650.00, 1, NULL),
('BH-1008', 5, 'Cinnamon Roll', 120.00, 2, NULL),
('BH-1007', 2, 'Red Velvet Cake', 720.00, 1, NULL),
('BH-1006', 4, 'Butter Croissant', 85.00, 6, NULL);

-- ----------------------------------------------------------------------------
-- 5. Table structure for table `custom_cakes`
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. Table structure for table `messages`
-- ----------------------------------------------------------------------------
CREATE TABLE `messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `messages` (`name`, `email`, `subject`, `message`) VALUES
('Ana Gomez', 'ana@example.com', 'Wedding Cake Inquiry', 'Hi! Do you accommodate 3-tier custom wedding cakes for November?');
