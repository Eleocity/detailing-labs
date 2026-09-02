-- FormaOps Phase 4: tracks OpenAI token usage per business per calendar
-- month, so the $20/month hard budget cutoff (docs/formaops/DECISIONS.md
-- open decision #1) can be enforced deterministically in our own code
-- before calling OpenAI, not by waiting on OpenAI's own billing dashboard
-- to catch up. See server/formaops/agents/budget.ts.

CREATE TABLE aiUsageLedger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  businessId INT NOT NULL,
  yearMonth VARCHAR(7) NOT NULL,
  inputTokens INT NOT NULL DEFAULT 0,
  outputTokens INT NOT NULL DEFAULT 0,
  estimatedCostCents INT NOT NULL DEFAULT 0,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY aiUsageLedger_business_month (businessId, yearMonth)
);
