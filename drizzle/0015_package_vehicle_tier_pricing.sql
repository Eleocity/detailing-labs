-- Adds vehicle-size tier pricing columns to `packages`, closing a real gap
-- found during FormaOps Phase 2 live verification: `packages.price` was a
-- single flat price, but two active packages (Full Showroom Reset, The
-- Signature Detail) also had CODE-based per-vehicle-size pricing in
-- shared/services.ts that a FormaOps pricing ChangeRequest could never
-- reach, so an approved price change updated the flat price everywhere
-- except the actual booking checkout price for a selected vehicle size.
-- See docs/formaops/DECISIONS.md and server/formaops/executors/pricing.ts.
--
-- NULL on all three tier columns means "no tiered pricing" (quote-only
-- services keep using the flat price). Backfill below sets `priceSedan` to
-- the package's CURRENT `price` (preserving any price already approved
-- through FormaOps, since `price` has always been kept equal to the sedan
-- tier by convention — see shared/services.ts's `fromPrice` doc comment),
-- and seeds `priceSuv`/`priceLarge` from the values that have been in
-- shared/services.ts since the packages were introduced (neither has ever
-- been changed by any executor, since none supported them until now).

ALTER TABLE `packages` ADD COLUMN `priceSedan` decimal(10,2);

ALTER TABLE `packages` ADD COLUMN `priceSuv` decimal(10,2);

ALTER TABLE `packages` ADD COLUMN `priceLarge` decimal(10,2);

UPDATE `packages` SET `priceSedan` = `price`, `priceSuv` = 269.99, `priceLarge` = 359.99
  WHERE `name` = 'Full Showroom Reset';

UPDATE `packages` SET `priceSedan` = `price`, `priceSuv` = 529.99, `priceLarge` = 649.99
  WHERE `name` = 'The Signature Detail';
