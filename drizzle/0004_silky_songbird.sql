CREATE TABLE `userInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('user','admin','employee') NOT NULL DEFAULT 'user',
	`token` varchar(128) NOT NULL,
	`invitedBy` int NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `userInvitations_token_unique` UNIQUE(`token`)
);
