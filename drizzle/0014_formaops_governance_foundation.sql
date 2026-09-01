-- FormaOps Phase 1: governance foundation. Purely additive — no existing
-- table is altered, `users.role` is untouched. See docs/formaops/DATABASE.md.

CREATE TABLE businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE businessMemberships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  businessId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('OWNER','OPERATIONS_MANAGER','MANAGER','EMPLOYEE','AI_SYSTEM') NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY businessMemberships_business_user (businessId, userId)
);

CREATE TABLE permissions (
  `key` VARCHAR(100) PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE rolePermissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('OWNER','OPERATIONS_MANAGER','MANAGER','EMPLOYEE','AI_SYSTEM') NOT NULL,
  permissionKey VARCHAR(100) NOT NULL,
  UNIQUE KEY rolePermissions_role_permission (role, permissionKey)
);

CREATE TABLE changeRequests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  businessId INT NOT NULL,
  submittedByUserId INT NOT NULL,
  source VARCHAR(40) NOT NULL,
  category ENUM('pricing','hours','services','promotions','content','business_profile','other') NOT NULL,
  riskLevel ENUM('GREEN','YELLOW','RED') NOT NULL,
  status ENUM('DRAFT','AWAITING_APPROVAL','APPROVED','REJECTED','EXECUTING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'AWAITING_APPROVAL',
  originalRequest TEXT NOT NULL,
  proposedChange JSON NOT NULL,
  requiredApprovalRole ENUM('OWNER','OPERATIONS_MANAGER','MANAGER','EMPLOYEE','AI_SYSTEM') NOT NULL,
  reasoningSummary TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  changeRequestId INT NOT NULL,
  approvedByUserId INT NOT NULL,
  decision ENUM('APPROVED','REJECTED') NOT NULL,
  note TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditEvents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  businessId INT NOT NULL,
  actorUserId INT NULL,
  actorType ENUM('HUMAN','AI_SYSTEM') NOT NULL,
  action VARCHAR(100) NOT NULL,
  targetType VARCHAR(60) NOT NULL,
  targetId INT NULL,
  metadata JSON NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed: the one tenant that exists today.
INSERT INTO businesses (name) VALUES ('Forma Auto Spa');

-- Seed: permission catalog (docs/formaops/PERMISSIONS.md).
INSERT INTO permissions (`key`, description) VALUES
  ('website.read', 'View website content and configuration'),
  ('website.request_change', 'Request a website change'),
  ('website.publish_low_risk', 'Publish a GREEN-risk website change without further approval'),
  ('website.approve_change', 'Approve a pending website ChangeRequest'),
  ('business_profile.read', 'View business profile information'),
  ('business_profile.request_change', 'Request a business profile change'),
  ('business_profile.modify', 'Directly modify business profile information'),
  ('services.read', 'View service catalog'),
  ('services.request_change', 'Request a service catalog change'),
  ('services.approve_change', 'Approve a pending service ChangeRequest'),
  ('pricing.read', 'View pricing'),
  ('pricing.request_change', 'Request a pricing change'),
  ('pricing.approve_change', 'Approve a pending pricing ChangeRequest'),
  ('hours.read', 'View business hours'),
  ('hours.request_change', 'Request an hours change'),
  ('hours.approve_change', 'Approve a pending hours ChangeRequest'),
  ('promotions.read', 'View promotions'),
  ('promotions.request_change', 'Request a promotions change'),
  ('promotions.approve_change', 'Approve a pending promotions ChangeRequest'),
  ('content.read', 'View site content'),
  ('content.request_change', 'Request a content change'),
  ('content.approve_change', 'Approve a pending content ChangeRequest'),
  ('users.read', 'View users'),
  ('users.manage', 'Manage users'),
  ('roles.read', 'View roles'),
  ('roles.manage', 'Manage roles'),
  ('permissions.read', 'View permissions'),
  ('permissions.manage', 'Manage permission grants'),
  ('approvals.read', 'View approval history'),
  ('approvals.act', 'Approve or reject a ChangeRequest'),
  ('deployments.read', 'View deployment history'),
  ('deployments.execute', 'Execute a deployment'),
  ('integrations.read', 'View integration configuration'),
  ('integrations.manage', 'Manage integration configuration'),
  ('audit.read', 'View the audit log'),
  ('security.manage', 'Manage security configuration');

-- Seed: default role grants (docs/formaops/PERMISSIONS.md grant table).
INSERT INTO rolePermissions (role, permissionKey) VALUES
  -- OWNER: everything
  ('OWNER','website.read'),('OWNER','website.request_change'),('OWNER','website.publish_low_risk'),('OWNER','website.approve_change'),
  ('OWNER','business_profile.read'),('OWNER','business_profile.request_change'),('OWNER','business_profile.modify'),
  ('OWNER','services.read'),('OWNER','services.request_change'),('OWNER','services.approve_change'),
  ('OWNER','pricing.read'),('OWNER','pricing.request_change'),('OWNER','pricing.approve_change'),
  ('OWNER','hours.read'),('OWNER','hours.request_change'),('OWNER','hours.approve_change'),
  ('OWNER','promotions.read'),('OWNER','promotions.request_change'),('OWNER','promotions.approve_change'),
  ('OWNER','content.read'),('OWNER','content.request_change'),('OWNER','content.approve_change'),
  ('OWNER','users.read'),('OWNER','users.manage'),
  ('OWNER','roles.read'),('OWNER','roles.manage'),
  ('OWNER','permissions.read'),('OWNER','permissions.manage'),
  ('OWNER','approvals.read'),('OWNER','approvals.act'),
  ('OWNER','deployments.read'),('OWNER','deployments.execute'),
  ('OWNER','integrations.read'),('OWNER','integrations.manage'),
  ('OWNER','audit.read'),('OWNER','security.manage'),
  -- OPERATIONS_MANAGER: read + request_change everywhere, publish_low_risk, no approve
  ('OPERATIONS_MANAGER','website.read'),('OPERATIONS_MANAGER','website.request_change'),('OPERATIONS_MANAGER','website.publish_low_risk'),
  ('OPERATIONS_MANAGER','business_profile.read'),('OPERATIONS_MANAGER','business_profile.request_change'),
  ('OPERATIONS_MANAGER','services.read'),('OPERATIONS_MANAGER','services.request_change'),
  ('OPERATIONS_MANAGER','pricing.read'),('OPERATIONS_MANAGER','pricing.request_change'),
  ('OPERATIONS_MANAGER','hours.read'),('OPERATIONS_MANAGER','hours.request_change'),
  ('OPERATIONS_MANAGER','promotions.read'),('OPERATIONS_MANAGER','promotions.request_change'),
  ('OPERATIONS_MANAGER','content.read'),('OPERATIONS_MANAGER','content.request_change'),
  ('OPERATIONS_MANAGER','deployments.read'),('OPERATIONS_MANAGER','integrations.read'),('OPERATIONS_MANAGER','audit.read'),('OPERATIONS_MANAGER','approvals.read'),
  -- MANAGER: same as OPERATIONS_MANAGER for now (see PERMISSIONS.md)
  ('MANAGER','website.read'),('MANAGER','website.request_change'),
  ('MANAGER','business_profile.read'),('MANAGER','business_profile.request_change'),
  ('MANAGER','services.read'),('MANAGER','services.request_change'),
  ('MANAGER','pricing.read'),('MANAGER','pricing.request_change'),
  ('MANAGER','hours.read'),('MANAGER','hours.request_change'),
  ('MANAGER','promotions.read'),('MANAGER','promotions.request_change'),
  ('MANAGER','content.read'),('MANAGER','content.request_change'),
  ('MANAGER','deployments.read'),('MANAGER','integrations.read'),('MANAGER','audit.read'),('MANAGER','approvals.read'),
  -- EMPLOYEE: read-only
  ('EMPLOYEE','website.read'),('EMPLOYEE','business_profile.read'),('EMPLOYEE','services.read'),
  ('EMPLOYEE','pricing.read'),('EMPLOYEE','hours.read'),('EMPLOYEE','promotions.read'),('EMPLOYEE','content.read'),
  -- AI_SYSTEM: read + request_change only, never approve/execute/manage
  ('AI_SYSTEM','website.read'),('AI_SYSTEM','website.request_change'),
  ('AI_SYSTEM','business_profile.read'),('AI_SYSTEM','business_profile.request_change'),
  ('AI_SYSTEM','services.read'),('AI_SYSTEM','services.request_change'),
  ('AI_SYSTEM','pricing.read'),('AI_SYSTEM','pricing.request_change'),
  ('AI_SYSTEM','hours.read'),('AI_SYSTEM','hours.request_change'),
  ('AI_SYSTEM','promotions.read'),('AI_SYSTEM','promotions.request_change'),
  ('AI_SYSTEM','content.read'),('AI_SYSTEM','content.request_change');
