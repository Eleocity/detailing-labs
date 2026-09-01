/**
 * ChangeRequest service functions. Every side effect here follows the
 * sequence from docs/formaops/AGENTS.md: resolve actor → resolve business
 * (caller-supplied, always re-validated) → validate input → check
 * permission → check policy → check state → execute → audit → return.
 *
 * These are the same functions a future OpenAI tool (Phase 4) will call —
 * no privileged shortcut exists or will be added for that later caller.
 */
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  changeRequests,
  approvals,
  type ChangeRequest,
  type ChangeRequestCategory,
} from "../../drizzle/schema";
import { classifyRisk, requiredApprovalRole } from "./policy";
import { hasPermission, requestChangePermissionFor } from "./permissions";
import { record as recordAudit } from "./audit";
import { EXECUTORS } from "./executors";

export async function create(
  db: any,
  input: {
    businessId: number;
    submittedByUserId: number;
    actorType: "HUMAN" | "AI_SYSTEM";
    source: string;
    category: ChangeRequestCategory;
    originalRequest: string;
    proposedChange: Record<string, unknown>;
    reasoningSummary?: string;
  }
): Promise<ChangeRequest> {
  const permission = requestChangePermissionFor(input.category);
  const allowed = await hasPermission(
    db,
    input.businessId,
    input.submittedByUserId,
    permission
  );
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Missing permission "${permission}" for this business.`,
    });
  }

  // Validate proposedChange strictly for categories with a real executor,
  // at CREATE time — failing fast here means an owner never approves
  // something that turns out to be malformed. Categories with no executor
  // yet (services, promotions, content, business_profile, other) stay
  // loosely validated (Record<string, unknown>) until an executor is
  // added for them — see docs/formaops/STATUS.md.
  const executor = EXECUTORS[input.category];
  if (executor) {
    const parsed = executor.schema.safeParse(input.proposedChange);
    if (!parsed.success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid ${input.category} change: ${parsed.error.issues.map(i => i.message).join("; ")}`,
      });
    }
  }

  const riskLevel = classifyRisk(input.category);
  const approvalRole = requiredApprovalRole(riskLevel);

  const result = await db.insert(changeRequests).values({
    businessId: input.businessId,
    submittedByUserId: input.submittedByUserId,
    source: input.source,
    category: input.category,
    riskLevel,
    status: "AWAITING_APPROVAL",
    originalRequest: input.originalRequest,
    proposedChange: input.proposedChange,
    requiredApprovalRole: approvalRole,
    reasoningSummary: input.reasoningSummary ?? null,
  });
  const id = (result as any)[0]?.insertId;

  await recordAudit(db, {
    businessId: input.businessId,
    actorUserId: input.submittedByUserId,
    actorType: input.actorType,
    action: "change_request.created",
    targetType: "change_request",
    targetId: id,
    metadata: { category: input.category, riskLevel, source: input.source },
  });

  return getByIdOrThrow(db, id);
}

export async function getByIdOrThrow(
  db: any,
  id: number
): Promise<ChangeRequest> {
  const [row] = await db
    .select()
    .from(changeRequests)
    .where(eq(changeRequests.id, id))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "ChangeRequest not found." });
  }
  return row;
}

async function decide(
  db: any,
  input: {
    changeRequestId: number;
    actingUserId: number;
    actorType: "HUMAN" | "AI_SYSTEM";
    decision: "APPROVED" | "REJECTED";
    note?: string;
  }
): Promise<ChangeRequest> {
  const cr = await getByIdOrThrow(db, input.changeRequestId);

  if (cr.status !== "AWAITING_APPROVAL") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `ChangeRequest is already ${cr.status}, not awaiting approval.`,
    });
  }

  // The ability to REQUEST a change must never grant the authority to
  // APPROVE it — checked before anything else, unconditionally.
  if (input.actingUserId === cr.submittedByUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot approve or reject your own request.",
    });
  }

  const [hasActPermission, role] = await Promise.all([
    hasPermission(db, cr.businessId, input.actingUserId, "approvals.act"),
    (async () => {
      const { getMembershipRole } = await import("./permissions");
      return getMembershipRole(db, cr.businessId, input.actingUserId);
    })(),
  ]);
  if (!hasActPermission || role !== cr.requiredApprovalRole) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This request requires approval from a ${cr.requiredApprovalRole}.`,
    });
  }

  await db.insert(approvals).values({
    changeRequestId: cr.id,
    approvedByUserId: input.actingUserId,
    decision: input.decision,
    note: input.note ?? null,
  });

  const newStatus = input.decision === "APPROVED" ? "APPROVED" : "REJECTED";
  await db
    .update(changeRequests)
    .set({ status: newStatus })
    .where(eq(changeRequests.id, cr.id));

  await recordAudit(db, {
    businessId: cr.businessId,
    actorUserId: input.actingUserId,
    actorType: input.actorType,
    action: `change_request.${input.decision === "APPROVED" ? "approved" : "rejected"}`,
    targetType: "change_request",
    targetId: cr.id,
    metadata: { note: input.note ?? null },
  });

  if (input.decision === "APPROVED") {
    await executeApprovedChange(db, cr, input.actingUserId, input.actorType);
  }

  return getByIdOrThrow(db, cr.id);
}

/**
 * Dispatches to the registered executor for cr.category, if any (see
 * server/formaops/executors/index.ts). Categories with no executor simply
 * stay APPROVED — that's the correct, honest current behavior, not a bug.
 * Never throws: a failed execution is a real, valid terminal state (status
 * FAILED) surfaced on the returned row, not an exception — the approval
 * itself already succeeded and must not be misreported as having failed
 * just because the follow-on execution did.
 */
async function executeApprovedChange(
  db: any,
  cr: ChangeRequest,
  actingUserId: number,
  actorType: "HUMAN" | "AI_SYSTEM"
): Promise<void> {
  const executor = EXECUTORS[cr.category];
  if (!executor) return;

  await db
    .update(changeRequests)
    .set({ status: "EXECUTING" })
    .where(eq(changeRequests.id, cr.id));

  try {
    const change = executor.schema.parse(cr.proposedChange);
    const { before, after } = await executor.execute(db, change);

    await db
      .update(changeRequests)
      .set({ status: "COMPLETED" })
      .where(eq(changeRequests.id, cr.id));

    await recordAudit(db, {
      businessId: cr.businessId,
      actorUserId: actingUserId,
      actorType,
      action: "change_request.executed",
      targetType: "change_request",
      targetId: cr.id,
      metadata: { proposedChange: cr.proposedChange, before, after },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await db
      .update(changeRequests)
      .set({ status: "FAILED", reasoningSummary: `Execution failed: ${message}` })
      .where(eq(changeRequests.id, cr.id));

    await recordAudit(db, {
      businessId: cr.businessId,
      actorUserId: actingUserId,
      actorType,
      action: "change_request.execution_failed",
      targetType: "change_request",
      targetId: cr.id,
      metadata: { error: message },
    });
  }
}

export function approve(
  db: any,
  input: {
    changeRequestId: number;
    actingUserId: number;
    actorType: "HUMAN" | "AI_SYSTEM";
    note?: string;
  }
): Promise<ChangeRequest> {
  return decide(db, { ...input, decision: "APPROVED" });
}

export function reject(
  db: any,
  input: {
    changeRequestId: number;
    actingUserId: number;
    actorType: "HUMAN" | "AI_SYSTEM";
    note?: string;
  }
): Promise<ChangeRequest> {
  return decide(db, { ...input, decision: "REJECTED" });
}
