/**
 * Append-only audit log. Nothing in server/formaops/ ever UPDATEs or
 * DELETEs a row here. See docs/formaops/DATABASE.md.
 */
import { auditEvents } from "../../drizzle/schema";

export async function record(
  db: any,
  event: {
    businessId: number;
    actorUserId: number | null;
    actorType: "HUMAN" | "AI_SYSTEM";
    action: string;
    targetType: string;
    targetId?: number | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<void> {
  await db.insert(auditEvents).values({
    businessId: event.businessId,
    actorUserId: event.actorUserId,
    actorType: event.actorType,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId ?? null,
    metadata: event.metadata ?? null,
  });
}
