CREATE TABLE conditionReports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookingId INT NOT NULL,
  customerId INT,
  vehicleId INT,
  checkedById INT,
  paintCondition ENUM('excellent','good','fair','poor') DEFAULT 'good',
  interiorCondition ENUM('excellent','good','fair','poor') DEFAULT 'good',
  existingDamage JSON,
  notes TEXT,
  photos JSON,
  customerSignature TINYINT(1) DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
