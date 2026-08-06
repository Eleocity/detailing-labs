-- BookingProvider abstraction support: sync status columns on bookings,
-- an integration-mapping table (local <-> Urable IDs), booking drafts for
-- the multi-step wizard, and draft-scoped photo uploads.

ALTER TABLE bookings
  ADD COLUMN providerName VARCHAR(40) NULL,
  ADD COLUMN providerStatus VARCHAR(40) NULL,
  ADD COLUMN providerMessage TEXT NULL,
  ADD COLUMN externalEventId VARCHAR(100) NULL;

CREATE TABLE integrationMappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entityType ENUM('customer','vehicle','booking','order') NOT NULL,
  localId INT NOT NULL,
  externalCustomerId VARCHAR(100) NULL,
  externalVehicleId VARCHAR(100) NULL,
  externalJobId VARCHAR(100) NULL,
  externalEventId VARCHAR(100) NULL,
  externalOrderId VARCHAR(100) NULL,
  syncStatus ENUM('pending','synced','failed') NOT NULL DEFAULT 'pending',
  lastSyncedAt TIMESTAMP NULL,
  lastError TEXT NULL,
  idempotencyKey VARCHAR(100) NULL UNIQUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE bookingDrafts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(40) NOT NULL UNIQUE,
  customerId INT NULL,
  step VARCHAR(40) NULL DEFAULT 'service_type',
  serviceType ENUM('mobile','drop_off','estimate') NULL,
  selections JSON NULL,
  conditionAnswers JSON NULL,
  attribution JSON NULL,
  bookingId INT NULL,
  expiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE media
  ADD COLUMN bookingDraftId INT NULL;
