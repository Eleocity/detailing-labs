-- Deposit tracking on bookings
ALTER TABLE `bookings`
  ADD COLUMN `depositAmount`     decimal(10,2) NULL,
  ADD COLUMN `depositPaid`       boolean NOT NULL DEFAULT false,
  ADD COLUMN `depositPaidAt`     timestamp NULL,
  ADD COLUMN `depositPaymentUrl` varchar(500) NULL,
  ADD COLUMN `depositOrderId`    varchar(200) NULL;
