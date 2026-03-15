CREATE TABLE `menuShares` (
  `id` varchar(36) NOT NULL,
  `userId` int NOT NULL,
  `title` varchar(255),
  `itemsJson` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
