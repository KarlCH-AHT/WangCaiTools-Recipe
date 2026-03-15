ALTER TABLE `menuShares`
ADD COLUMN `metadataJson` text;

CREATE TABLE `weeklyMenus` (
  `id` varchar(36) NOT NULL,
  `userId` int NOT NULL,
  `title` varchar(255),
  `startDate` varchar(16) NOT NULL,
  `itemsJson` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
