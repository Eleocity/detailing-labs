-- SMS/TCPA consent columns — fixes the Twilio Toll-Free Verification
-- rejection ("SMS consent must be explicit and separately recorded").
-- Added to both `bookings` (every submission, including guest bookings
-- with no email/customer row) and `customers` (the durable per-person
-- record) rather than a new table, extending the existing models.
--
-- smsConsent defaults to FALSE on both tables so every existing row is
-- explicitly "not opted in" — no existing customer or booking is silently
-- treated as having consented.

ALTER TABLE bookings
  ADD COLUMN smsConsent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN smsConsentTimestamp TIMESTAMP NULL,
  ADD COLUMN smsConsentSource VARCHAR(40) NULL,
  ADD COLUMN smsConsentPhone VARCHAR(32) NULL,
  ADD COLUMN smsConsentText TEXT NULL;

ALTER TABLE customers
  ADD COLUMN smsConsent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN smsConsentTimestamp TIMESTAMP NULL,
  ADD COLUMN smsConsentSource VARCHAR(40) NULL,
  ADD COLUMN smsConsentPhone VARCHAR(32) NULL,
  ADD COLUMN smsConsentText TEXT NULL;
