/**
 * Executes an APPROVED hours ChangeRequest against the real `siteContent`
 * table (section "contact", keys "hours_weekday"/"hours_weekend" — the
 * same rows Contact.tsx and server/_core/index.ts's seed already read/
 * write). Deliberately narrow scope, matching ROADMAP.md's choice of hours
 * as "the next-simplest category": a single row update, no per-date
 * override table. "Change tomorrow's closing time to 3" (the spec's own
 * example) is NOT representable by this executor — that needs a real
 * date-specific override concept, which doesn't exist yet. This handles
 * "change our standing weekday/weekend hours," nothing finer-grained.
 */
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { siteContent } from "../../../drizzle/schema";

export const hoursChangeSchema = z.object({
  field: z.enum(["hours_weekday", "hours_weekend"]),
  newValue: z.string().min(1).max(200),
});

export type HoursChange = z.infer<typeof hoursChangeSchema>;

export async function executeHoursChange(
  db: any,
  change: HoursChange
): Promise<{ before: string | null; after: string }> {
  const [existing] = await db
    .select()
    .from(siteContent)
    .where(
      and(eq(siteContent.section, "contact"), eq(siteContent.key, change.field))
    )
    .limit(1);

  const before = existing?.value ?? null;

  if (existing) {
    await db
      .update(siteContent)
      .set({ value: change.newValue })
      .where(eq(siteContent.id, existing.id));
  } else {
    await db.insert(siteContent).values({
      section: "contact",
      key: change.field,
      value: change.newValue,
    });
  }

  return { before, after: change.newValue };
}
