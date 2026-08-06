CREATE TABLE loyaltyPoints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  bookingId INT,
  points INT NOT NULL,
  type ENUM('earned','redeemed','adjusted') NOT NULL DEFAULT 'earned',
  description VARCHAR(500),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE customers ADD COLUMN referralCode VARCHAR(8) UNIQUE;

CREATE TABLE referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrerId INT NOT NULL,
  referredCustomerId INT NOT NULL,
  bookingId INT,
  status ENUM('pending','qualified','rewarded') NOT NULL DEFAULT 'pending',
  rewardAmount DECIMAL(10,2) DEFAULT 0.00,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
