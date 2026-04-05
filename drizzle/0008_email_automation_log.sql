CREATE TABLE IF NOT EXISTS `emailAutomationLog` (
  `id`            int AUTO_INCREMENT PRIMARY KEY,
  `automationType` varchar(60)  NOT NULL,
  `bookingId`     int          NULL,
  `customerId`    int          NULL,
  `email`         varchar(320) NOT NULL,
  `status`        varchar(20)  NOT NULL DEFAULT 'sent',
  `sentAt`        timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `error`         text         NULL,
  UNIQUE KEY `uq_auto_booking` (`automationType`, `bookingId`),
  INDEX `idx_auto_email`  (`email`),
  INDEX `idx_auto_type`   (`automationType`),
  INDEX `idx_auto_sent`   (`sentAt`)
);

CREATE TABLE IF NOT EXISTS `emailAutomationSettings` (
  `id`        int AUTO_INCREMENT PRIMARY KEY,
  `type`      varchar(60)  NOT NULL UNIQUE,
  `enabled`   boolean      NOT NULL DEFAULT true,
  `updatedAt` timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO `emailAutomationSettings` (`type`, `enabled`) VALUES
  ('appointment_reminder_24h', true),
  ('appointment_reminder_2h',  true),
  ('review_request',           true),
  ('win_back_90d',             true),
  ('coating_anniversary',      true);
