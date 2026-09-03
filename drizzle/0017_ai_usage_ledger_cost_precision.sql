-- Fixes a real precision bug found during live testing: estimatedCostCents
-- was an INT, and server/formaops/agents/budget.ts rounded to a whole cent
-- on every single write. A single cheap agent call costs a fraction of a
-- cent (e.g. gpt-5-mini: ~0.06-0.15 cents/call), so each update started
-- from an already-rounded-down base and rounded straight back to the same
-- value — real spend could accumulate indefinitely while the tracked total
-- stayed stuck near zero, defeating the $20/month hard cutoff
-- (docs/formaops/DECISIONS.md open decision #1) it exists to enforce.
-- DECIMAL(12,4) keeps real fractional-cent precision across accumulation.

ALTER TABLE `aiUsageLedger` MODIFY COLUMN `estimatedCostCents` DECIMAL(12,4) NOT NULL DEFAULT 0;
