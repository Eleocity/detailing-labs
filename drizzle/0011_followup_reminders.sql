CREATE TABLE followUpQueue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookingId INT NOT NULL,
  customerId INT,
  type ENUM('review_request','follow_up','rebook_offer') NOT NULL DEFAULT 'review_request',
  scheduledFor TIMESTAMP NOT NULL,
  sentAt TIMESTAMP NULL,
  status ENUM('pending','sent','skipped') NOT NULL DEFAULT 'pending',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointmentReminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookingId INT NOT NULL,
  type ENUM('24h','2h') NOT NULL DEFAULT '24h',
  channel ENUM('email','sms') NOT NULL DEFAULT 'email',
  scheduledFor TIMESTAMP NOT NULL,
  sentAt TIMESTAMP NULL,
  status ENUM('pending','sent','failed','disabled') NOT NULL DEFAULT 'pending',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
