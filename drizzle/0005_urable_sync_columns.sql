-- Add Urable sync columns to customers and bookings tables
ALTER TABLE `customers`
  ADD COLUMN `urableId` varchar(100),
  ADD COLUMN `urableSyncedAt` timestamp;

ALTER TABLE `bookings`
  ADD COLUMN `urableJobId` varchar(100),
  ADD COLUMN `urableSyncedAt` timestamp;
