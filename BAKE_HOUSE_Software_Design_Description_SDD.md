# CORDOVA PUBLIC COLLEGE
## COLLEGE OF COMPUTER STUDIES
### Bachelor of Science in Information Technology

---

# SOFTWARE DESIGN DESCRIPTION (SDD)
### FOR
# BAKE HOUSE: ARTISANAL BAKERY MANAGEMENT, INTERACTIVE CAKE CUSTOMIZATION, AND DISPATCH SYSTEM

---

**Prepared by:**
* **Lead Developer / Author:** John Vincent C. Ong
* **Degree Program:** Bachelor of Science in Information Technology (BSIT)
* **Institution:** Cordova Public College, Gabi, Cordova, Cebu
* **Academic Year:** 2025–2026

**Approved by Evaluation Committee:**

_____________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _____________________________
**Capstone Adviser** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Technical Panel Member**

_____________________________
**Dean, College of Computer Studies**

---

## Document Revision History

| Version | Date | Primary Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| **1.0** | September 2025 | John Vincent Ong | Initial architectural design and database entity mapping. |
| **1.1** | October 2025 | John Vincent Ong | Added interactive custom cake preview specification and real-time chat architecture. |
| **1.2** | February 2026 | John Vincent Ong | Integrated Kitchen Dispatch Queue, POS module, and Web Serial thermal printing engine. |
| **2.0** | October 2026 | John Vincent Ong | Final defense release: Added configurable tax/VAT engine, GPS delivery pinning, and PST timezone synchronization. |
| **2.1** | October 2026 | John Vincent Ong | Updated Relational ERD (`order_items` to `products`, `messages` to `users`), database-backed store delivery fee settings, real-time client polling sync, and mandatory customer authentication guards. |

---

## Table of Contents
1. [Introduction](#1-introduction)
   * 1.1 Purpose
   * 1.2 Scope of the System
   * 1.3 Definitions, Acronyms, and Abbreviations
2. [System Overview](#2-system-overview)
   * 2.1 Problem Context & System Rationale
   * 2.2 Key System Capabilities
3. [System Architecture](#3-system-architecture)
   * 3.1 Architectural Style & Design Principles
   * 3.2 System Decomposition
   * 3.3 Customer Authentication & Security Guard Architecture
   * 3.4 Hardware & Network Interfaces
4. [Data Design & Database Architecture](#4-data-design--database-architecture)
   * 4.1 Relational Entity Relationship Diagram (ERD) Model
   * 4.2 Comprehensive Data Dictionary
     * `users` Table
     * `products` Table
     * `orders` Table
     * `order_items` Table
     * `custom_cakes` Table
     * `custom_cake_chats` Table
     * `store_settings` Table
     * `messages` Table
5. [Component & Subsystem Design](#5-component--subsystem-design)
   * 5.1 Interactive Custom Cake Builder Subsystem
   * 5.2 Real-Time Baker Consultation & Chat Widget
   * 5.3 Kitchen Production & Delivery Dispatch Queue
   * 5.4 Counter POS & Direct Hardware Thermal Printing
   * 5.5 Dynamic Store Settings & Delivery Tariff Subsystem
   * 5.6 Real-Time Order Lifecycle Polling Engine
6. [Human Interface Design (UI/UX)](#6-human-interface-design-uiux)
7. [Requirements Traceability Matrix (RTM)](#7-requirements-traceability-matrix-rtm)
8. [Appendices](#8-appendices)

---

## 1. Introduction

### 1.1 Purpose
This Software Design Description (SDD) provides a comprehensive technical blueprint for the **BAKE HOUSE** platform. It specifies the architectural patterns, component structures, data schemas, communication interfaces, and user interaction designs implemented throughout the system.

This document is prepared for:
1. Academic evaluation by the Capstone Committee at Cordova Public College.
2. Software maintainers and developers extending the platform.
3. System administrators and bakery personnel operating the system in a production bakery setting.

### 1.2 Scope of the System
BAKE HOUSE is an enterprise-ready, web-based management and customer-facing system built specifically for artisanal bakeries and pastry cafes. Unlike generic retail platforms, BAKE HOUSE handles both standard catalog ordering (breads, pastries, retail packs) and complex made-to-order baked goods (custom event cakes, tiered designs, and rush orders).

The platform encompasses three user roles:
* **Online Customers:** Browse artisanal catalog items, design customized event cakes with visual live feedback, select store pickup or doorstep delivery with GPS pinpoints, schedule dates and pickup windows, and consult directly with master decorators via live messaging.
* **Bakery Staff & Cashiers:** Run over-the-counter sales using the high-speed Touch POS, tender cash, print physical 58mm/80mm thermal receipts, and claim online pre-orders.
* **Master Bakers & Administrators:** Manage catalog inventory, review and approve/deny incoming custom cake designs with specific clarification notes, track real-time kitchen baking queues, monitor advance event bookings, configure tax/VAT policies, adjust store delivery tariffs, and inspect financial reports.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term / Acronym | Definition |
| :--- | :--- |
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **API** | Application Programming Interface (HTTP REST services used for frontend-backend communication) |
| **BCrypt** | Adaptive cryptographic key-derivation function used for hashing user passwords |
| **ERD** | Entity Relationship Diagram |
| **ESC/POS** | Standardized command code language developed by Epson for controlling thermal receipt printers |
| **FK** | Foreign Key constraint ensuring referential integrity between relational database tables |
| **Lead Time** | The minimum advance notice required by the bakery before a custom order can be prepared |
| **OAuth** | Open Authorization protocol utilized for third-party sign-in via Google |
| **PK** | Primary Key |
| **POS** | Point of Sale terminal used by counter cashiers |
| **PST** | Philippine Standard Time (UTC+8:00) |
| **RTM** | Requirements Traceability Matrix |
| **SDD** | Software Design Description |
| **STD** | Software Test Description |
| **VAT** | Value-Added Tax (legally mandated Philippine standard rate at 12%) |
| **Web Serial API** | W3C standard browser interface enabling direct communication with USB/Serial peripherals |

---

## 2. System Overview

### 2.1 Problem Context & System Rationale
Traditional artisanal bakeries and pastry shops often grapple with operational friction arising from disjointed communication channels:
* Custom event cakes negotiated across informal social media messaging apps suffer from lost specifications, unrecorded customer requests, and inaccurate pricing quotes.
* Front-of-house cashiers using standalone register machines struggle to reconcile physical retail sales with online pre-orders, resulting in duplicate sales and inventory discrepancies.
* Delivery addresses in provincial municipalities (such as Cordova, Cebu) frequently lack precise street numbering, causing delayed handoffs and delivery failures.

BAKE HOUSE eliminates these issues by integrating cake customizer visual feedback, dedicated order-linked baker consultation channels, GPS map pinpointing, real-time kitchen dispatch queues, and offline-capable touch POS registers into a unified platform.

---

## 3. System Architecture

### 3.1 Architectural Style & Design Principles
The platform adopts a decoupled **3-Tier Architecture**:
1. **Presentation Layer (Frontend):** Developed in React 19 and Vite 5, delivering a high-performance Single Page Application (SPA).
2. **Application & Business Logic Layer (Backend):** Built with PHP 8 RESTful services adhering to clean separation of concerns, secure input sanitation, and standardized JSON responses.
3. **Data Persistence Layer:** Relational MySQL / TiDB Database operating with InnoDB ACID-compliant transactions, supplemented by an emergency local JSON data store fallback for uninterrupted offline continuity.

### 3.2 Customer Authentication & Security Guard Architecture
To ensure data integrity, accountability, and seamless order tracking, BAKE HOUSE enforces strict customer authentication boundaries:
* **Public Browsing:** Visitors can freely explore the bakery showcase, browse categories, search products, and test the custom cake builder without restriction.
* **Authentication Enforcement:** Placing an order or customizing a cake requires an authenticated customer account. Unregistered users attempting to proceed to checkout from the cart or submitting a customized cake are prompted with an account requirement dialog.
* **Post-Authentication Session Continuity:** The authentication engine preserves the customer's intended destination using query state parameters (`?redirect=/checkout` or `?redirect=/personalize`). Upon successful credential verification or Google OAuth single sign-on, the user is automatically returned to their active checkout session without losing cart selections.
* **Direct Order-User Binding:** Guarantees every placed order has a valid `user_id`, linking the customer directly to real-time status updates and order-specific chat channels.

---

## 4. Data Design & Database Architecture

### 4.1 Relational Entity Relationship Diagram (ERD) Model
The relational model comprises 8 core tables designed in Third Normal Form (3NF) to maximize data integrity and support high-speed relational queries:
1. `users` (Core user entity storing credentials, contact info, roles, and default delivery coordinates).
2. `products` (Catalog products with pricing, stock counts, and categories).
3. `orders` (Fulfillment records linked to `users` via `user_id`).
4. `order_items` (Itemized order contents linked to `orders` via `order_id` and `products` via `product_id`).
5. `custom_cakes` (Parametric custom cake inquiries linked to `users` via `user_id`).
6. `custom_cake_chats` (Order-isolated consultation messages linked to active sessions).
7. `store_settings` (Key-value store maintaining operational configuration, tax policies, and delivery fees).
8. `messages` (Customer and guest inquiries linked to `users` via `user_id`).

### 4.2 Comprehensive Data Dictionary

#### `users` Table
*Primary entity representing all platform accounts (Customer, Staff, Administrator).*

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK, AUTO_INCREMENT | Unique user identifier. |
| `username` | VARCHAR(50) | NOT NULL, UNIQUE | Customer or staff username. |
| `first_name` | VARCHAR(100) | NOT NULL | User first name. |
| `last_name` | VARCHAR(100) | NOT NULL | User surname. |
| `email` | VARCHAR(191) | NOT NULL, UNIQUE | User email address. |
| `contact_number` | VARCHAR(50) | NULL | Philippine mobile phone number. |
| `password` | VARCHAR(255) | NULL | Cryptographic BCrypt password hash (null for OAuth users). |
| `role` | ENUM('customer','staff','admin') | NOT NULL, DEFAULT 'customer' | Role-based authorization level. |
| `google_id` | VARCHAR(100) | NULL, UNIQUE | Third-party Google OAuth unique user ID. |
| `avatar` | VARCHAR(500) | NULL | Profile image URL. |
| `default_street` | VARCHAR(255) | NULL | House number, street, or subdivision. |
| `default_barangay` | VARCHAR(100) | NULL | Barangay name (e.g., Poblacion, Gabi, Bangbang). |
| `default_city` | VARCHAR(100) | NULL | Municipality name (Cordova). |
| `default_province` | VARCHAR(100) | NULL | Province (Cebu). |
| `default_landmark` | VARCHAR(255) | NULL | Delivery navigation landmark. |
| `default_lat` | DECIMAL(10, 7) | NULL | GPS latitude coordinate. |
| `default_lng` | DECIMAL(10, 7) | NULL | GPS longitude coordinate. |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp. |

#### `products` Table
*Stores bakery catalog items, pastry offerings, and inventory levels.*

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK, AUTO_INCREMENT | Unique product identifier. |
| `name` | VARCHAR(200) | NOT NULL | Display name of the baked product. |
| `description` | TEXT | NULL | Item ingredients, allergens, and description. |
| `category` | VARCHAR(50) | NOT NULL | Catalog category (Sourdough, Pastries, Cakes, Breads). |
| `price` | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00 | Unit selling price in Philippine Pesos. |
| `image` | VARCHAR(500) | NULL | Relative path or cloud URL to product photography. |
| `stock` | INT | NOT NULL, DEFAULT 20 | Current on-hand quantity available for sale. |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'Available' | Availability state ('Available', 'Out of Stock'). |
| `bestseller` | TINYINT(1) | NOT NULL, DEFAULT 0 | Bestseller spotlight flag (1 = Featured, 0 = Normal). |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date product was added to catalog. |

#### `orders` Table
*Fulfillment records for both online delivery/pickup orders and counter POS transactions.*

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(50) | PK | Unique alphanumeric order reference (e.g. 'BH-1008'). |
| `user_id` | INT | NULL, FK -> `users`(`id`) | Linked user account (SET NULL on delete). |
| `customer_name` | VARCHAR(200) | NOT NULL | Full name of recipient or counter patron. |
| `customer_contact` | VARCHAR(50) | NOT NULL | Contact telephone/mobile number. |
| `fulfillment_type` | VARCHAR(50) | NOT NULL, DEFAULT 'Delivery' | Fulfillment method ('Delivery', 'Pickup', 'POS'). |
| `delivery_address` | TEXT | NOT NULL | Delivery address or pickup branch identification. |
| `delivery_coordinates` | JSON | NULL | JSON object storing `{ lat, lng }` GPS coordinates. |
| `distance_km` | DECIMAL(6, 2) | NULL | Calculated travel distance from bakery branch. |
| `payment_method` | VARCHAR(50) | NOT NULL, DEFAULT 'COD' | Payment channel ('Cash on Delivery', 'Cash', 'GCash', 'Maya'). |
| `subtotal` | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00 | Order subtotal before taxes and tariffs. |
| `delivery_fee` | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00 | Dynamic delivery charge based on store settings. |
| `total` | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00 | Final grand total payable. |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'Pending' | Lifecycle state ('Pending', 'Preparing', 'For Delivery', 'Completed', 'Denied'). |
| `cancellation_reason` | TEXT | NULL | Reason note recorded when an order is denied or cancelled. |
| `scheduled_date` | DATE | NULL | Advance fulfillment date for custom bookings. |
| `scheduled_time` | TIME | NULL | Requested delivery or pickup time window. |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Order creation timestamp (PST/UTC+8). |

#### `order_items` Table
*Contains itemized product records for every placed order.*

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK, AUTO_INCREMENT | Unique line item identifier. |
| `order_id` | VARCHAR(50) | NOT NULL, FK -> `orders`(`id`) | Parent order reference (CASCADE on delete). |
| `product_id` | INT | NULL, FK -> `products`(`id`) | Catalog product reference (SET NULL on delete). |
| `product_name` | VARCHAR(200) | NOT NULL | Frozen snapshot of item name at time of purchase. |
| `price` | DECIMAL(10, 2) | NOT NULL | Frozen unit selling price at time of purchase. |
| `quantity` | INT | NOT NULL, DEFAULT 1 | Quantity purchased. |
| `customization` | JSON | NULL | Structured custom cake parameters (tiers, flavor, piping, dedication). |

#### `store_settings` Table
*Centralized operational key-value configuration table supporting dynamic store controls.*

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `setting_key` | VARCHAR(100) | PK | Configuration key identifier (e.g., 'store_config'). |
| `setting_value` | LONGTEXT | NULL | JSON-encoded configuration payload containing delivery fees, VAT rates, and operational toggles. |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Timestamp of last administrative configuration change. |

#### `messages` Table
*Customer and public Contact Us inquiries.*

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK, AUTO_INCREMENT | Unique message identifier. |
| `user_id` | INT | NULL, FK -> `users`(`id`) | Linked user account if inquiry was submitted by a logged-in customer. |
| `name` | VARCHAR(150) | NOT NULL | Sender name. |
| `email` | VARCHAR(150) | NOT NULL | Sender contact email. |
| `subject` | VARCHAR(255) | NOT NULL | Inquiry subject title. |
| `message` | TEXT | NOT NULL | Inquiry message body. |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Message submission timestamp. |

---

## 5. Component & Subsystem Design

### 5.1 Dynamic Store Settings & Delivery Tariff Subsystem
Administrative settings are managed via `Settings.jsx` and backed by the `store_settings` table in MySQL/TiDB. The delivery tariff engine operates dynamically:
* When an administrator adjusts the standard delivery fee (e.g. from ₱50 to ₱1,000), the value is written to the `store_config` JSON payload in `store_settings`.
* The `get_settings.php` endpoint queries the database table first, ensuring client checkouts immediately reflect the active rate across all devices.
* The customer checkout interface reactively recalculates the grand total without hardcoded legacy assumptions.

### 5.2 Real-Time Order Lifecycle Polling Engine
To provide an instantaneous tracking experience for customers:
* The `MyOrders.jsx` and `OrderDetails.jsx` views run an asynchronous background polling cycle every 3.5 seconds.
* Window `focus` and `visibilitychange` listeners guarantee that as soon as a customer switches to their tracking tab, the latest kitchen status is fetched.
* When a baker transitions an order to *"Ready for Pickup"* or *"Delivered"*, the customer's order card and visual timeline stepper update on screen without requiring manual browser reload.

---

## 6. Requirements Traceability Matrix (RTM)

| Req ID | Requirement Description | System Component | Database Entity | Verification Test |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | User Authentication & Google OAuth | `Account.jsx`, `authService.js` | `users` | TC-01 |
| **FR-02** | Customer Checkout Auth Enforcement | `Cart.jsx`, `Checkout.jsx` | `users`, `orders` | TC-03 |
| **FR-03** | Interactive Custom Cake Builder | `Personalize.jsx` | `custom_cakes`, `order_items` | TC-02 |
| **FR-04** | Dynamic Store Delivery Fee Config | `Settings.jsx`, `Checkout.jsx` | `store_settings`, `orders` | TC-04 |
| **FR-05** | Kitchen Production Queue Segregation | `Queue.jsx` | `orders` | TC-05 |
| **FR-06** | Real-Time Order Lifecycle Tracking | `MyOrders.jsx`, `OrderDetails.jsx` | `orders` | TC-06 |
| **FR-07** | Custom Cake Denial with Reason Note | `AdminCakeChatModal.jsx` | `orders` | TC-07 |
| **FR-08** | Real-Time Baker Consultation Chat | `CakeChatBox.jsx` | `custom_cake_chats` | TC-08 |
| **FR-09** | Counter POS Touch Terminal & Printing | `CounterPOS.jsx`, `printerService.js` | `orders`, `order_items` | TC-09 |
| **FR-10** | Atomic Stock Deduction & Low-Stock Alert | `products.php`, `Inventory.jsx` | `products` | TC-10 |
| **FR-11** | Dynamic 12% BIR VAT Tax Engine | `Settings.jsx`, `pos_orders.php` | `store_settings` | TC-11 |
| **FR-12** | Responsive Mobile & Touch Usability | Global Styles, `Navbar.jsx` | N/A | TC-12 |
