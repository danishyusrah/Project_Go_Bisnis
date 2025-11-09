-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 09, 2025 at 02:24 AM
-- Server version: 8.0.30
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `go_bisnis_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` longtext,
  `user_id` bigint UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `created_at`, `updated_at`, `deleted_at`, `name`, `email`, `phone`, `address`, `user_id`) VALUES
(1, '2025-11-09 08:32:38.015', '2025-11-09 08:32:38.015', NULL, 'Robert', 'admin@gmail.com', '0816752551', 'jln ciledug raya', 1);

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `description` longtext,
  `purchase_price` decimal(20,2) DEFAULT NULL,
  `selling_price` decimal(20,2) DEFAULT NULL,
  `stock` bigint DEFAULT '0',
  `user_id` bigint UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `created_at`, `updated_at`, `deleted_at`, `name`, `sku`, `description`, `purchase_price`, `selling_price`, `stock`, `user_id`) VALUES
(1, '2025-11-08 12:44:43.941', '2025-11-08 12:48:07.294', '2025-11-08 12:54:54.579', 'Kelapa', 'Kelapa-0021', 'Stok Kelapa', '5000.00', '8000.00', 489, 1),
(4, '2025-11-08 12:55:23.533', '2025-11-09 09:15:38.645', NULL, 'Kelapa Bulat', 'Kelapa-0024', 'Buah Kelapa Tua', '5000.00', '8000.00', 900, 1),
(5, '2025-11-09 09:15:10.245', '2025-11-09 09:15:10.245', NULL, 'Kelapa Parut', 'Ks-08272', 'Santan kelapa', '5000.00', '12000.00', 20, 1),
(6, '2025-11-09 09:21:57.183', '2025-11-09 09:24:11.998', NULL, 'Testing', 'Kdhehe', 'Tes', '50000.00', '1000000.00', 99000, 1);

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `type` varchar(191) NOT NULL,
  `total_amount` decimal(20,2) NOT NULL,
  `notes` longtext,
  `customer` longtext,
  `customer_id` bigint UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `created_at`, `updated_at`, `deleted_at`, `user_id`, `type`, `total_amount`, `notes`, `customer`, `customer_id`) VALUES
(1, '2025-11-09 09:15:38.646', '2025-11-09 09:15:38.646', NULL, 1, 'INCOME', '800000.00', '', NULL, 1),
(2, '2025-11-09 09:24:11.998', '2025-11-09 09:24:11.998', NULL, 1, 'INCOME', '1000000000.00', '', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `transaction_items`
--

CREATE TABLE `transaction_items` (
  `id` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `transaction_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `product_name` longtext NOT NULL,
  `quantity` bigint NOT NULL,
  `unit_price` decimal(20,2) NOT NULL,
  `purchase_price` decimal(20,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `transaction_items`
--

INSERT INTO `transaction_items` (`id`, `created_at`, `updated_at`, `deleted_at`, `transaction_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `purchase_price`) VALUES
(1, '2025-11-09 09:15:38.647', '2025-11-09 09:15:38.647', NULL, 1, 4, 'Kelapa Bulat', 100, '8000.00', '5000.00'),
(2, '2025-11-09 09:24:11.999', '2025-11-09 09:24:11.999', NULL, 2, 6, 'Testing', 1000, '1000000.00', '50000.00');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` longtext NOT NULL,
  `full_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `created_at`, `updated_at`, `deleted_at`, `username`, `email`, `password_hash`, `full_name`) VALUES
(1, '2025-11-08 12:00:43.910', '2025-11-09 08:48:10.727', NULL, 'danish', 'danish@gmail.com', '$2a$10$CUf3P6QW.GrIexSlc3luRu3iJekstHRhq3hDOP76v0RbGXeAjqjue', 'Danish Yusrah');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customers_deleted_at` (`deleted_at`),
  ADD KEY `fk_customers_user` (`user_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_products_sku` (`sku`),
  ADD KEY `idx_products_deleted_at` (`deleted_at`),
  ADD KEY `fk_users_products` (`user_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_transactions_deleted_at` (`deleted_at`),
  ADD KEY `idx_transactions_type` (`type`),
  ADD KEY `idx_transactions_customer_id` (`customer_id`),
  ADD KEY `idx_transactions_user_id` (`user_id`),
  ADD KEY `idx_transactions_created_at` (`created_at`);

--
-- Indexes for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_transaction_items_deleted_at` (`deleted_at`),
  ADD KEY `idx_transaction_items_transaction_id` (`transaction_id`),
  ADD KEY `idx_transaction_items_product_id` (`product_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_users_username` (`username`),
  ADD UNIQUE KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_deleted_at` (`deleted_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `transaction_items`
--
ALTER TABLE `transaction_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_users_products` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_customers_transactions` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD CONSTRAINT `fk_transaction_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_transactions_items` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
