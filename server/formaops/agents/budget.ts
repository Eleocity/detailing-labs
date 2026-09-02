/**
 * Enforces the $20/month hard OpenAI spend cutoff decided in
 * docs/formaops/DECISIONS.md (open decision #1). Checked BEFORE every
 * agent run, not just logged after — the goal is a request that never
 * reaches OpenAI once the ceiling is crossed, so spend can't overshoot by
 * more than one in-flight call. Degrades gracefully: see
 * server/formaops/agents/manager.ts's handleIncomingMessage, which replies
 * with a plain message pointing at the admin panel instead of the request
 * silently vanishing.
 *
 * Cost is estimated from token counts using per-1M-token rates that default
 * to gpt-5-mini's published pricing. If FORMAOPS_AGENT_MODEL is overridden
 * to a different model, override FORMAOPS_AGENT_INPUT_COST_CENTS_PER_1M /
 * FORMAOPS_AGENT_OUTPUT_COST_CENTS_PER_1M to match — this is an estimate
 * for our own cutoff, not a substitute for checking OpenAI's actual bill.
 */
import { eq, and } from "drizzle-orm";
import { aiUsageLedger } from "../../../drizzle/schema";

const MONTHLY_BUDGET_CENTS = Number(
  process.env.FORMAOPS_AI_MONTHLY_BUDGET_CENTS ?? 2000 // $20.00
);
const INPUT_COST_CENTS_PER_1M = Number(
  process.env.FORMAOPS_AGENT_INPUT_COST_CENTS_PER_1M ?? 12.5
);
const OUTPUT_COST_CENTS_PER_1M = Number(
  process.env.FORMAOPS_AGENT_OUTPUT_COST_CENTS_PER_1M ?? 100
);

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function getLedgerRow(db: any, businessId: number, yearMonth: string) {
  const [row] = await db
    .select()
    .from(aiUsageLedger)
    .where(
      and(
        eq(aiUsageLedger.businessId, businessId),
        eq(aiUsageLedger.yearMonth, yearMonth)
      )
    )
    .limit(1);
  return row ?? null;
}

/** True if this business has already hit its monthly AI budget this month. */
export async function isBudgetExceeded(
  db: any,
  businessId: number
): Promise<boolean> {
  const row = await getLedgerRow(db, businessId, currentYearMonth());
  return (row?.estimatedCostCents ?? 0) >= MONTHLY_BUDGET_CENTS;
}

/** Records usage from a completed agent run against the current month's running total. */
export async function recordUsage(
  db: any,
  businessId: number,
  usage: { inputTokens: number; outputTokens: number }
): Promise<void> {
  const yearMonth = currentYearMonth();
  const costCents =
    (usage.inputTokens / 1_000_000) * INPUT_COST_CENTS_PER_1M +
    (usage.outputTokens / 1_000_000) * OUTPUT_COST_CENTS_PER_1M;

  const existing = await getLedgerRow(db, businessId, yearMonth);
  if (existing) {
    await db
      .update(aiUsageLedger)
      .set({
        inputTokens: existing.inputTokens + usage.inputTokens,
        outputTokens: existing.outputTokens + usage.outputTokens,
        estimatedCostCents: Math.round(
          existing.estimatedCostCents + costCents
        ),
      })
      .where(eq(aiUsageLedger.id, existing.id));
    return;
  }

  await db.insert(aiUsageLedger).values({
    businessId,
    yearMonth,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    estimatedCostCents: Math.round(costCents),
  });
}
