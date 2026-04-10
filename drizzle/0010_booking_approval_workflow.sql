-- Add pending_review and declined to booking status enum
ALTER TABLE `bookings`
  MODIFY COLUMN `status` enum(
    'pending_review',
    'new',
    'confirmed',
    'assigned',
    'en_route',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'declined'
  ) NOT NULL DEFAULT 'pending_review';

-- Add approval workflow fields
ALTER TABLE `bookings`
  ADD COLUMN `alternateDate`        timestamp NULL AFTER `appointmentDate`,
  ADD COLUMN `vehicleConditionNotes` text NULL AFTER `notes`,
  ADD COLUMN `serviceType`          varchar(20) DEFAULT 'mobile' AFTER `vehicleConditionNotes`,
  ADD COLUMN `reviewedAt`           timestamp NULL,
  ADD COLUMN `reviewedBy`           int NULL,
  ADD COLUMN `declineReason`        text NULL,
  ADD COLUMN `zapierWebhookSent`    boolean DEFAULT false,
  ADD COLUMN `approvalToken`        varchar(64) NULL UNIQUE;

-- Index for fast pending_review queries
ALTER TABLE `bookings` ADD INDEX `idx_status_created` (`status`, `createdAt`);

-- Update status history to include new statuses
ALTER TABLE `bookingStatusHistory`
  MODIFY COLUMN `toStatus` varchar(30) NOT NULL,
  MODIFY COLUMN `fromStatus` varchar(30);
