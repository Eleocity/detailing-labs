CREATE TABLE giftCards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(12) NOT NULL UNIQUE,
  purchaserName VARCHAR(200),
  purchaserEmail VARCHAR(320),
  recipientName VARCHAR(200),
  recipientEmail VARCHAR(320),
  initialBalance DECIMAL(10,2) NOT NULL,
  currentBalance DECIMAL(10,2) NOT NULL,
  status ENUM('active','redeemed','expired','cancelled') NOT NULL DEFAULT 'active',
  expiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE giftCardTransactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  giftCardId INT NOT NULL,
  bookingId INT,
  amount DECIMAL(10,2) NOT NULL,
  type ENUM('issue','redeem','refund','adjustment') NOT NULL DEFAULT 'issue',
  note VARCHAR(500),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
