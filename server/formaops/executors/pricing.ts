/**
 * Executes an APPROVED pricing ChangeRequest against the real `packages`
 * table — the first (and, as of Phase 2, only) category wired end-to-end
 * from "approved" to "actually changed." See docs/formaops/ROADMAP.md
 * "Immediate next step" and STATUS.md for what this does and doesn't cover.
 *
 * `newPrice` is the flat/"starting" price, which by convention (see
 * shared/services.ts's `fromPrice` doc comment) equals the sedan tier for
 * any package that has vehicle-tiered pricing. If the target package
 * already has tiered pricing (its `priceSedan` column is set), this always
 * keeps `priceSedan` equal to `newPrice`. `newPriceSuv`/`newPriceLarge` are
 * optional — omit them to change only the base/sedan price and leave the
 * other two tiers untouched; include them to update all three in one
 * ChangeRequest. A package with no tiered pricing (priceSedan is NULL,
 * e.g. quote-only services) never gets tier columns touched, even if
 * newPriceSuv/newPriceLarge are supplied — there is nothing to update.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import { packages } from "../../../drizzle/schema";

export const pricingChangeSchema = z.object({
  packageName: z.string().min(1).max(200),
  newPrice: z.number().positive().max(100000),
  newPriceSuv: z.number().positive().max(100000).optional(),
  newPriceLarge: z.number().positive().max(100000).optional(),
});

export type PricingChange = z.infer<typeof pricingChangeSchema>;

interface PriceSnapshot {
  price: number;
  priceSedan: number | null;
  priceSuv: number | null;
  priceLarge: number | null;
}

function snapshot(row: {
  price: unknown;
  priceSedan: unknown;
  priceSuv: unknown;
  priceLarge: unknown;
}): PriceSnapshot {
  return {
    price: Number(row.price),
    priceSedan: row.priceSedan != null ? Number(row.priceSedan) : null,
    priceSuv: row.priceSuv != null ? Number(row.priceSuv) : null,
    priceLarge: row.priceLarge != null ? Number(row.priceLarge) : null,
  };
}

export async function executePricingChange(
  db: any,
  change: PricingChange
): Promise<{ before: PriceSnapshot; after: PriceSnapshot }> {
  const [existing] = await db
    .select()
    .from(packages)
    .where(eq(packages.name, change.packageName))
    .limit(1);

  if (!existing) {
    throw new Error(
      `No package named "${change.packageName}" exists in the packages table.`
    );
  }

  const before = snapshot(existing);
  const hasTieredPricing = before.priceSedan != null;

  const update: Record<string, any> = {
    price: change.newPrice.toFixed(2),
  };
  if (hasTieredPricing) {
    update.priceSedan = change.newPrice.toFixed(2);
    if (change.newPriceSuv !== undefined) {
      update.priceSuv = change.newPriceSuv.toFixed(2);
    }
    if (change.newPriceLarge !== undefined) {
      update.priceLarge = change.newPriceLarge.toFixed(2);
    }
  }

  await db
    .update(packages)
    .set(update)
    .where(eq(packages.name, change.packageName));

  const after: PriceSnapshot = {
    price: change.newPrice,
    priceSedan: hasTieredPricing ? change.newPrice : null,
    priceSuv: hasTieredPricing
      ? (change.newPriceSuv ?? before.priceSuv)
      : null,
    priceLarge: hasTieredPricing
      ? (change.newPriceLarge ?? before.priceLarge)
      : null,
  };

  return { before, after };
}
