CREATE TABLE `recipeImages` (
	`id` varchar(36) NOT NULL,
	`recipeId` varchar(36) NOT NULL,
	`url` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recipeImages_id` PRIMARY KEY(`id`)
);
