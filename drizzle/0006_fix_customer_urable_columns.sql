ALTER TABLE `customers`
  ADD COLUMN IF NOT EXISTS `urableId` varchar(100),
  ADD COLUMN IF NOT EXISTS `urableSyncedAt` timestamp;
