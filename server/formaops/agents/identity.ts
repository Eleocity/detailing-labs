/**
 * Resolves an inbound SMS's phone number to a real, identified user with a
 * FormaOps membership on the business — the piece the SMS channel needs
 * that the web chat gets for free from an authenticated session (see
 * docs/formaops/AGENTS.md and STATUS.md).
 *
 * Matches on the last 10 digits so storage-format differences ("(262)
 * 260-9474", "2622609474", "+12622609474") and a US country-code prefix
 * don't cause a false miss. Reuses shared/brand.ts's phoneDigits() rather
 * than a second normalization implementation.
 */
import { users } from "../../../drizzle/schema";
import { phoneDigits } from "../../../shared/brand";
import { getMembershipRole } from "../permissions";

function last10Digits(phone: string): string {
  return phoneDigits(phone).slice(-10);
}

export interface ResolvedSmsIdentity {
  userId: number;
  businessId: number;
}

/**
 * Returns the resolved {userId, businessId} for a texting phone number, or
 * a reason string explaining why it couldn't be resolved (never throws —
 * every caller needs a plain-English reply to send back, not an exception).
 */
export async function resolvePhoneToBusinessUser(
  db: any,
  businessId: number,
  fromPhone: string
): Promise<{ ok: true; identity: ResolvedSmsIdentity } | { ok: false; reason: string }> {
  const targetLast10 = last10Digits(fromPhone);
  if (targetLast10.length !== 10) {
    return { ok: false, reason: "not a recognizable phone number" };
  }

  // No indexed phone lookup exists (users.phone isn't indexed, and storage
  // format varies) — this table is small enough for this comparison to be
  // fine; revisit if the user base grows large enough for this to matter.
  const allUsers = await db
    .select({ id: users.id, phone: users.phone })
    .from(users);

  const matches = allUsers.filter(
    (u: any) => u.phone && last10Digits(u.phone) === targetLast10
  );

  if (matches.length === 0) {
    return { ok: false, reason: "phone number not recognized" };
  }
  if (matches.length > 1) {
    // Data integrity issue (duplicate phone across accounts) — refuse
    // rather than guess which account to act as.
    return { ok: false, reason: "phone number matches more than one account" };
  }

  const userId = matches[0].id;
  const role = await getMembershipRole(db, businessId, userId);
  if (!role) {
    return { ok: false, reason: "not a member of this business" };
  }

  return { ok: true, identity: { userId, businessId } };
}
