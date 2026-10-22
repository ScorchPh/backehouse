-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: bakehouse_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `custom_cake_chats`
--

DROP TABLE IF EXISTS `custom_cake_chats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_cake_chats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `sender_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_role` enum('customer','admin','staff') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custom_cake_chats`
--

LOCK TABLES `custom_cake_chats` WRITE;
/*!40000 ALTER TABLE `custom_cake_chats` DISABLE KEYS */;
/*!40000 ALTER TABLE `custom_cake_chats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `custom_cakes`
--

DROP TABLE IF EXISTS `custom_cakes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_cakes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `size` varchar(50) NOT NULL,
  `flavor` varchar(50) NOT NULL,
  `shape` varchar(50) NOT NULL,
  `color` varchar(50) NOT NULL,
  `occasion` varchar(50) NOT NULL,
  `message` varchar(255) DEFAULT NULL,
  `instructions` text,
  `price` decimal(10,2) NOT NULL DEFAULT '700.00',
  `status` varchar(50) NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `custom_cakes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custom_cakes`
--

LOCK TABLES `custom_cakes` WRITE;
/*!40000 ALTER TABLE `custom_cakes` DISABLE KEYS */;
/*!40000 ALTER TABLE `custom_cakes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_messages_user` (`user_id`),
  CONSTRAINT `fk_messages_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` varchar(50) NOT NULL,
  `product_id` int DEFAULT NULL,
  `product_name` varchar(200) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `customization` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `fk_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,'BH-1008',NULL,'Chocolate Cake',850.00,1,NULL),(2,'BH-1007',NULL,'Chocolate Cake',1200.00,1,NULL),(3,'BH-1006',NULL,'Chocolate Cake',750.00,1,NULL),(5,'BH-6A9A651324',1,'Chocolate Cake',650.00,1,NULL),(6,'BH-6A9A653145',1,'Chocolate Cake',650.00,1,NULL),(7,'BH-6A9A68C043',7,'Cheese Bread',45.00,1,NULL),(8,'BH-6A9A68C043',8,'Spanish Bread',30.00,1,NULL),(9,'BH-6A9A68DB64',8,'Spanish Bread',30.00,4,NULL),(10,'BH-6A9A6EB581',8,'Spanish Bread',30.00,1,NULL),(11,'BH-6A9A6EB581',7,'Cheese Bread',45.00,1,NULL),(12,'BH-6AAF8AD743',2,'Red Velvet Cake',720.00,2,NULL),(13,'BH-6AAF8B3848',8,'Spanish Bread',30.00,1,NULL),(14,'BH-6ABB5F0846',NULL,'Birthday Custom Cake',1050.00,1,'{\"size\": \"10 inches\", \"color\": \"White\", \"shape\": \"Square\", \"flavor\": \"Chocolate\", \"message\": \"Happy Birtday MwemWE\", \"occasion\": \"Birthday\", \"instructions\": \"AHAHAHHAHAHA\", \"is_scheduled\": true, \"scheduled_date\": \"2026-09-30\", \"scheduled_time\": \"02:30 PM\"}'),(15,'BH-1012',2,'Red Velvet Cake',720.00,6,NULL),(16,'BH-1012',10,'Ube Cake',900.00,1,NULL),(17,'BH-1013',2,'Red Velvet Cake',720.00,1,NULL);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` varchar(50) NOT NULL,
  `user_id` int DEFAULT NULL,
  `customer_name` varchar(200) NOT NULL,
  `customer_contact` varchar(50) NOT NULL,
  `delivery_address` text NOT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'Cash on Delivery',
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT '50.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` varchar(50) NOT NULL DEFAULT 'Pending',
  `cashier_name` varchar(100) DEFAULT NULL,
  `cash_tendered` decimal(10,2) DEFAULT NULL,
  `change_amount` decimal(10,2) DEFAULT NULL,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_type` varchar(50) DEFAULT NULL,
  `ref_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cancellation_reason` text,
  `delivery_coordinates` json DEFAULT NULL,
  `fulfillment_type` varchar(50) DEFAULT 'Delivery',
  `distance_km` decimal(6,2) DEFAULT NULL,
  `estimated_delivery_time` varchar(100) DEFAULT NULL,
  `scheduled_date` varchar(50) DEFAULT NULL,
  `scheduled_time` varchar(100) DEFAULT NULL,
  `is_scheduled` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES ('BH-1006',NULL,'Angela Reyes','+63 920 555 7890','78 Banilad Rd, Mandaue City','Cash on Delivery',750.00,50.00,800.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-02 08:45:23',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-1007',NULL,'Maria Santos','+63 917 888 1234','45 Mango Ave, Cebu City','GCash',1200.00,50.00,1250.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-02 08:45:23',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-1008',3,'Juan Dela Cruz','+63 912 345 6782','123 Rizal St, Poblacion, Cordova, Cebu','Cash on Delivery',850.00,50.00,900.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-02 08:45:23',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-1012',3,'Juan Dela Cruz','+63 912 345 6782','Tumoy , Brgy. Gabi, Cordova, Cebu','Cash on Delivery',5220.00,30.00,5250.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-10-21 02:54:55',NULL,'{\"lat\": 10.2705, \"lng\": 123.9575}','Delivery',3.90,'22–32 Minutes',NULL,NULL,0),('BH-1013',3,'Juan Dela Cruz','+63 912 345 6782','Villa Teresa Subd, Block 4, Brgy. Poblacion, Cordova, Cebu (Landmark: Near yellow gate)','Cash on Delivery',720.00,30.00,750.00,'For Delivery',NULL,NULL,NULL,0.00,NULL,NULL,'2026-10-21 14:00:58',NULL,'{\"lat\": 10.2545, \"lng\": 123.9492}','Delivery',1.20,'25–35 Minutes',NULL,NULL,0),('BH-6A9A651324',NULL,'Walk-in Customer','N/A (Over-the-Counter)','Store Counter (Poblacion, Cordova Branch)','Cash',650.00,0.00,650.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-04 06:28:35',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-6A9A653145',NULL,'Walk-in Customer','N/A (Over-the-Counter)','Store Counter (Poblacion, Cordova Branch)','Cash',650.00,0.00,650.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-04 06:29:05',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-6A9A68C043',1,'Walk-in Customer','N/A (Over-the-Counter)','Store Counter (Poblacion, Cordova Branch)','Cash',75.00,0.00,75.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-04 06:44:16',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-6A9A68DB64',1,'Walk-in Customer','N/A (Over-the-Counter)','Store Counter (Poblacion, Cordova Branch)','Cash',120.00,0.00,120.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-04 06:44:43',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-6A9A6EB581',1,'Walk-in Customer','N/A (Over-the-Counter)','Store Counter (Poblacion, Cordova Branch)','Cash',75.00,0.00,75.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-04 07:09:41',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-6AAF8AD743',3,'Juan Dela Cruz','+63 912 345 6782','Manuel L. Quezon National Highway, Brgy. Bangbang, Cordova, Cebu','Cash on Delivery',1440.00,50.00,1490.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-20 07:27:19',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-6AAF8B3848',1,'Walk-in Customer','N/A (Over-the-Counter)','Store Counter (Poblacion, Cordova Branch)','Cash',30.00,0.00,30.00,'Completed',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-20 07:28:56',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0),('BH-6ABB5F0846',3,'Juan Dela Cruz','+63 912 345 6782','Purok Makugihon, Brgy. Poblacion, Cordova, Cebu','Cash on Delivery',1050.00,50.00,1100.00,'Denied',NULL,NULL,NULL,0.00,NULL,NULL,'2026-09-29 06:47:36',NULL,NULL,'Delivery',NULL,NULL,NULL,NULL,0);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_batches`
--

DROP TABLE IF EXISTS `product_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `batch_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `initial_quantity` int NOT NULL DEFAULT '0',
  `expiration_date` date NOT NULL,
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Active','Expired','Depleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_expiry` (`product_id`,`expiration_date`),
  CONSTRAINT `product_batches_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_batches`
--

LOCK TABLES `product_batches` WRITE;
/*!40000 ALTER TABLE `product_batches` DISABLE KEYS */;
INSERT INTO `product_batches` VALUES (1,1,'B-20261021-2310',50,50,'2026-10-21',NULL,'Active','2026-10-21 02:17:40'),(2,2,'B-20261021-8254',3,10,'2026-10-22',NULL,'Active','2026-10-21 02:19:38'),(3,3,'B-20261021-4496',15,15,'2026-10-23',NULL,'Active','2026-10-21 02:19:49'),(4,10,'B-20261021-4674',0,1,'2026-10-21',NULL,'Depleted','2026-10-21 02:48:34');
/*!40000 ALTER TABLE `product_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `description` text,
  `category` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `image` varchar(500) DEFAULT NULL,
  `stock` int NOT NULL DEFAULT '20',
  `expiration_date` date DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Available',
  `bestseller` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Chocolate Cake','Rich chocolate sponge layered with creamy chocolate frosting.','Cake',650.00,'/uploads/productimg/chocolate_cake.jpg',63,'2026-10-21','Available',1,'2026-09-02 08:45:23'),(2,'Red Velvet Cake','Soft red velvet cake with smooth cream cheese frosting.','Cake',720.00,'/uploads/productimg/red_velvet_cake.jpg',9,'2026-10-22','Available',1,'2026-09-02 08:45:23'),(3,'Cheesecake','Classic New York style baked cheesecake with a buttery graham crust.','Cake',680.00,'/uploads/productimg/cheesecake.jpg',20,'2026-10-23','Available',0,'2026-09-02 08:45:23'),(4,'Butter Croissant','Flaky, buttery French croissant baked golden fresh every morning.','Pastry',85.00,'/uploads/productimg/butter_croissant.jpg',25,'2026-10-23','Available',1,'2026-09-02 08:45:23'),(5,'Cinnamon Roll','Soft cinnamon-infused dough swirled with cream cheese glaze.','Pastry',120.00,'/uploads/productimg/cinnamon_roll.jpg',18,'2026-10-26','Available',0,'2026-09-02 08:45:23'),(6,'Blueberry Muffin','Moist bakery muffin bursting with fresh sweet blueberries.','Pastry',95.00,'/uploads/productimg/blueberry_muffin.jpg',20,'2026-10-26','Available',0,'2026-09-02 08:45:23'),(7,'Cheese Bread','Soft, warm artisan bread generously filled with melted cheddar cheese.','Bread',45.00,'/uploads/productimg/cheese_bread.jpg',28,'2026-10-25','Available',0,'2026-09-02 08:45:23'),(8,'Spanish Bread','Traditional Filipino sweet rolled bread with buttery sugar filling.','Bread',30.00,'/uploads/productimg/spanish_bread.jpg',33,'2026-10-26','Available',0,'2026-09-02 08:45:23'),(9,'Pandesal','Freshly baked Filipino breakfast bread rolls with breadcrumbs.','Bread',25.00,'/uploads/productimg/pandesal.jpg',50,'2026-10-26','Available',0,'2026-09-02 08:45:23'),(10,'Ube Cake','Authentic purple yam chiffon cake with luscious halaya cream.','Cake',900.00,'/uploads/productimg/ube_cake.jpg',0,NULL,'Out of Stock',0,'2026-09-02 08:45:23');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_settings`
--

DROP TABLE IF EXISTS `store_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_settings` (
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_settings`
--

LOCK TABLES `store_settings` WRITE;
/*!40000 ALTER TABLE `store_settings` DISABLE KEYS */;
INSERT INTO `store_settings` VALUES ('customizer_options','{\"base_price\":700,\"advance_days\":1,\"sizes\":[{\"id\":\"s1\",\"name\":\"6 inches\",\"price_modifier\":0,\"description\":\"Serves 4\\u20136 persons\",\"active\":true},{\"id\":\"s2\",\"name\":\"8 inches\",\"price_modifier\":150,\"description\":\"Serves 8\\u201312 persons\",\"active\":true},{\"id\":\"s3\",\"name\":\"10 inches\",\"price_modifier\":300,\"description\":\"Serves 15\\u201320 persons\",\"active\":true},{\"id\":\"s4\",\"name\":\"12 inches\",\"price_modifier\":500,\"description\":\"Serves 25\\u201330 persons\",\"active\":true},{\"id\":\"s5\",\"name\":\"2-Tier (6\\\" + 8\\\")\",\"price_modifier\":1200,\"description\":\"Serves 30\\u201340 persons\",\"active\":true}],\"flavors\":[{\"id\":\"f1\",\"name\":\"Chocolate\",\"price_modifier\":0,\"active\":true},{\"id\":\"f2\",\"name\":\"Vanilla\",\"price_modifier\":0,\"active\":true},{\"id\":\"f3\",\"name\":\"Red Velvet\",\"price_modifier\":50,\"active\":true},{\"id\":\"f4\",\"name\":\"Ube\",\"price_modifier\":50,\"active\":true},{\"id\":\"f5\",\"name\":\"Mocha\",\"price_modifier\":30,\"active\":true},{\"id\":\"f6\",\"name\":\"Matcha Green Tea\",\"price_modifier\":80,\"active\":true}],\"shapes\":[{\"id\":\"sh1\",\"name\":\"Round\",\"price_modifier\":0,\"active\":true},{\"id\":\"sh2\",\"name\":\"Square\",\"price_modifier\":50,\"active\":true},{\"id\":\"sh3\",\"name\":\"Heart\",\"price_modifier\":100,\"active\":true},{\"id\":\"sh4\",\"name\":\"Star\",\"price_modifier\":150,\"active\":true}],\"colors\":[{\"id\":\"c1\",\"name\":\"White\",\"hex\":\"#FFFFFF\",\"border\":\"#CCCCCC\",\"active\":true},{\"id\":\"c2\",\"name\":\"Pink\",\"hex\":\"#FF69B4\",\"active\":true},{\"id\":\"c3\",\"name\":\"Blue\",\"hex\":\"#3B82F6\",\"active\":true},{\"id\":\"c4\",\"name\":\"Chocolate\",\"hex\":\"#54331D\",\"active\":true},{\"id\":\"c5\",\"name\":\"Lavender\",\"hex\":\"#C084FC\",\"active\":true},{\"id\":\"c6\",\"name\":\"Golden Yellow\",\"hex\":\"#FACC15\",\"active\":true},{\"id\":\"c7\",\"name\":\"Mint Green\",\"hex\":\"#86EFAC\",\"active\":true}],\"occasions\":[{\"id\":\"o1\",\"name\":\"Birthday\",\"active\":true},{\"id\":\"o2\",\"name\":\"Wedding\",\"active\":true},{\"id\":\"o3\",\"name\":\"Anniversary\",\"active\":true},{\"id\":\"o4\",\"name\":\"Graduation\",\"active\":true},{\"id\":\"o5\",\"name\":\"Baby Shower\",\"active\":true},{\"id\":\"o6\",\"name\":\"Christening\",\"active\":true},{\"id\":\"o7\",\"name\":\"Corporate Event\",\"active\":true}]}','2026-10-15 13:59:50'),('store_config','{\"bakery_name\":\"BAKE HOUSE\",\"email\":\"info@bakehouse.com\",\"contact_number\":\"0917-123-4567\",\"address\":\"Poblacion, Cordova, Cebu, Philippines\",\"social_links\":{\"facebook\":\"https://facebook.com\",\"instagram\":\"https://instagram.com\",\"tiktok\":\"https://tiktok.com\"},\"order_settings\":{\"accept_orders\":true,\"allow_customization\":true}}','2026-10-09 05:34:41');
/*!40000 ALTER TABLE `store_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(191) NOT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('customer','staff','admin') NOT NULL DEFAULT 'customer',
  `google_id` varchar(100) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `default_street` varchar(255) DEFAULT NULL,
  `default_barangay` varchar(100) DEFAULT NULL,
  `default_city` varchar(100) DEFAULT NULL,
  `default_province` varchar(100) DEFAULT NULL,
  `default_landmark` varchar(255) DEFAULT NULL,
  `default_lat` decimal(10,7) DEFAULT NULL,
  `default_lng` decimal(10,7) DEFAULT NULL,
  `address` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','Store','Administrator','admin@bakehouse.com','+63 912 345 6780','$2y$12$MiInE.Xod04mZlqrRd4B9uXhKJ5nCkflQnnTTBo4TwPOHyxc6SwKS','admin',NULL,NULL,'2026-09-02 08:45:22','','Poblacion','Cordova','Cebu','',10.2540000,123.9490000,'Poblacion, Cordova, Cebu'),(2,'staff','Head','Baker','staff@bakehouse.com','+63 912 345 6781','$2y$12$MiInE.Xod04mZlqrRd4B9uXhKJ5nCkflQnnTTBo4TwPOHyxc6SwKS','staff',NULL,NULL,'2026-09-02 08:45:22',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3,'customer','Juan','Dela Cruz','customer@bakehouse.com','+63 912 345 6782','$2y$12$MiInE.Xod04mZlqrRd4B9uXhKJ5nCkflQnnTTBo4TwPOHyxc6SwKS','customer',NULL,NULL,'2026-09-02 08:45:23','Villa Teresa Subd, Block 4','Poblacion','Cordova','Cebu','Near yellow gate',10.2545000,123.9492000,'Villa Teresa Subd, Block 4, Poblacion, Cordova, Cebu'),(7,'googleuser','Google','Customer','google.user@gmail.com',NULL,NULL,'customer','google_1029384756','https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200','2026-10-09 10:43:44',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(9,'ongjohnone','John','Ong','ongjohnone@gmail.com',NULL,NULL,'customer','google_john_123','https://lh3.googleusercontent.com/a/ACg8ocL3voQnqZJwKmzgTJWr6TfmVF4L8PJPlF5oVmRqAk6nJYSzYQ=s96-c','2026-10-13 05:35:11','','Poblacion','Cordova','Cebu','',10.2540000,123.9490000,NULL),(10,'johnong07242004','John','Vincent Ong','johnong07242004@gmail.com',NULL,NULL,'customer','google_am9obm9uZzA3MjQy','https://lh3.googleusercontent.com/a/ACg8ocKiTyvIb0Tk-KZWeDvW1llC4ahjqkkCDFayPq1pBB8btZgjr7OP=s96-c','2026-10-13 05:55:33','','Poblacion','Cordova','Cebu','',10.2540000,123.9490000,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-22  8:45:48
