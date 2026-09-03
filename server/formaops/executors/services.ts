/**
 * Executes an APPROVED `services` ChangeRequest — adds or removes one line
 * item from a package's `features` list (the JSON array of included-service
 * strings shown on Services.tsx/Pricing.tsx/Booking.tsx). This is the third
 * category wired end-to-end, chosen over `promotions` as a judgment call
 * (the user was unavailable to pick — see docs/formaops/DECISIONS.md):
 * `services` extends the same `packages` table `pricing` already touches,
 * so it needed no new table, and "add/remove an included item" is a
 * narrower, more obviously-correct operation than "create a homepage
 * promotion," which has no existing structured home yet.
 *
 * Action-based (add/remove one item), not "replace the whole list" —
 * replacing would require the proposer (human or AI) to correctly restate
 * every existing feature, and a stale or incomplete restatement would
 * silently drop real included items. Add/remove only ever touches the one
 * line actually being changed.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import { packages } from "../../../drizzle/schema";

export const servicesChangeSchema = z.object({
  packageName: z.string().min(1).max(200),
  action: z.enum(["add", "remove"]),
  item: z.string().min(1).max(300),
});

export type ServicesChange = z.infer<typeof servicesChangeSchema>;

export async function executeServicesChange(
  db: any,
  change: ServicesChange
): Promise<{ before: string[]; after: string[] }> {
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

  const before: string[] = existing.features ? JSON.parse(existing.features) : [];

  // Adding an item already present, or removing one that's already absent,
  // is a harmless no-op — not an error. Only a missing PACKAGE throws.
  const after =
    change.action === "add"
      ? before.includes(change.item)
        ? before
        : [...before, change.item]
      : before.filter(item => item !== change.item);

  await db
    .update(packages)
    .set({ features: JSON.stringify(after) })
    .where(eq(packages.name, change.packageName));

  return { before, after };
}
