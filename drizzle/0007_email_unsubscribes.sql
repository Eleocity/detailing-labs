ALTER TABLE `customers`
  ADD COLUMN `emailUnsubscribed` boolean DEFAULT false,
  ADD COLUMN `emailUnsubscribedAt` timestamp NULL;

CREATE TABLE IF NOT EXISTS `emailUnsubscribes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `email` varchar(320) NOT NULL UNIQUE,
  `unsubscribedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `source` varchar(50) DEFAULT 'self'
);
