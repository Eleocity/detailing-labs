CREATE TABLE IF NOT EXISTS `emailCustomAutomations` (
  `id`           int AUTO_INCREMENT PRIMARY KEY,
  `name`         varchar(200) NOT NULL,
  `triggerType`  varchar(60)  NOT NULL,
  `triggerValue` int          NOT NULL DEFAULT 0,
  `triggerUnit`  varchar(20)  NOT NULL DEFAULT 'hours',
  `subject`      varchar(500) NOT NULL,
  `body`         text         NOT NULL,
  `enabled`      boolean      NOT NULL DEFAULT true,
  `createdAt`    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE `emailAutomationLog`
  ADD COLUMN `customAutomationId` int NULL AFTER `automationType`,
  DROP INDEX `uq_auto_booking`,
  ADD UNIQUE KEY `uq_auto_booking_custom` (`automationType`, `bookingId`, `customAutomationId`);
