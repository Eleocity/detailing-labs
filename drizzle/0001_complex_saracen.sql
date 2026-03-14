CREATE TABLE `addOns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`duration` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `addOns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookingAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`employeeId` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`isPrimary` boolean DEFAULT true,
	CONSTRAINT `bookingAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookingStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`fromStatus` varchar(50),
	`toStatus` varchar(50) NOT NULL,
	`changedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookingStatusHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingNumber` varchar(20) NOT NULL,
	`customerId` int,
	`vehicleId` int,
	`customerFirstName` varchar(100) NOT NULL,
	`customerLastName` varchar(100) NOT NULL,
	`customerEmail` varchar(320),
	`customerPhone` varchar(32),
	`vehicleMake` varchar(100),
	`vehicleModel` varchar(100),
	`vehicleYear` int,
	`vehicleColor` varchar(50),
	`vehicleType` varchar(50),
	`vehicleLicensePlate` varchar(20),
	`serviceId` int,
	`packageId` int,
	`addOnIds` text,
	`serviceName` varchar(200),
	`packageName` varchar(200),
	`appointmentDate` timestamp NOT NULL,
	`appointmentEndTime` timestamp,
	`duration` int,
	`serviceAddress` text NOT NULL,
	`serviceCity` varchar(100),
	`serviceState` varchar(50),
	`serviceZip` varchar(20),
	`gateInstructions` text,
	`subtotal` decimal(10,2),
	`travelFee` decimal(10,2) DEFAULT '0.00',
	`taxAmount` decimal(10,2) DEFAULT '0.00',
	`totalAmount` decimal(10,2),
	`status` enum('new','confirmed','assigned','en_route','in_progress','completed','cancelled','no_show') NOT NULL DEFAULT 'new',
	`paymentStatus` enum('unpaid','deposit_paid','paid','refunded') DEFAULT 'unpaid',
	`source` varchar(100),
	`notes` text,
	`internalNotes` text,
	`howHeard` varchar(100),
	`reviewRequestSent` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_bookingNumber_unique` UNIQUE(`bookingNumber`)
);
--> statement-breakpoint
CREATE TABLE `businessSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `businessSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `crmNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`bookingId` int,
	`type` enum('note','call','email','sms','task','reminder') DEFAULT 'note',
	`content` text NOT NULL,
	`isCompleted` boolean DEFAULT false,
	`dueDate` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crmNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`address` text,
	`city` varchar(100),
	`state` varchar(50),
	`zip` varchar(20),
	`notes` text,
	`source` varchar(100),
	`tags` text,
	`crmStatus` enum('new_lead','contacted','quote_sent','booked','active','follow_up','vip','inactive') DEFAULT 'new_lead',
	`reviewRequestStatus` enum('not_sent','sent','reminded','completed') DEFAULT 'not_sent',
	`lifetimeValue` decimal(10,2) DEFAULT '0.00',
	`lastServiceDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employeeAvailability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(10) NOT NULL,
	`endTime` varchar(10) NOT NULL,
	`isAvailable` boolean DEFAULT true,
	CONSTRAINT `employeeAvailability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`role` enum('admin','manager','detailer') NOT NULL DEFAULT 'detailer',
	`status` enum('active','inactive','on_leave') DEFAULT 'active',
	`skills` text,
	`notes` text,
	`hireDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(30) NOT NULL,
	`bookingId` int NOT NULL,
	`customerId` int,
	`lineItems` text NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`travelFee` decimal(10,2) DEFAULT '0.00',
	`taxRate` decimal(5,4) DEFAULT '0.0000',
	`taxAmount` decimal(10,2) DEFAULT '0.00',
	`totalAmount` decimal(10,2) NOT NULL,
	`status` enum('draft','sent','paid','overdue','cancelled') DEFAULT 'draft',
	`notes` text,
	`dueDate` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int,
	`customerId` int,
	`vehicleId` int,
	`uploadedBy` int,
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileName` varchar(255),
	`mimeType` varchar(100),
	`fileSize` int,
	`label` enum('before','after','progress','damage','completed','other') DEFAULT 'other',
	`caption` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`isRead` boolean DEFAULT false,
	`relatedId` int,
	`relatedType` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`duration` int NOT NULL,
	`features` text,
	`isPopular` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`customerId` int,
	`channel` enum('email','sms','both') DEFAULT 'email',
	`status` enum('pending','sent','reminded','completed','opted_out') DEFAULT 'pending',
	`sentAt` timestamp,
	`reminderSentAt` timestamp,
	`completedAt` timestamp,
	`reviewLink` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceAreas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`zipCodes` text,
	`travelFee` decimal(10,2) DEFAULT '0.00',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `serviceAreas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`category` varchar(100),
	`basePrice` decimal(10,2) NOT NULL,
	`duration` int NOT NULL,
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`make` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`year` int,
	`color` varchar(50),
	`vehicleType` enum('sedan','suv','truck','van','coupe','convertible','wagon','other') DEFAULT 'sedan',
	`licensePlate` varchar(20),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','employee') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);