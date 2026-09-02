import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isBudgetExceeded, recordUsage } from "./budget";

/** Mock db tracking insert/update calls, with a configurable existing row. */
function makeMockDb(existingRow: Record<string, unknown> | null) {
  const inserted: Record<string, unknown>[] = [];
  const updated: { id: unknown; values: Record<string, unknown> }[] = [];
  return {
    inserted,
    updated,
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (existingRow ? [existingRow] : []),
        }),
      }),
    }),
    insert: () => ({
      values: async (values: Record<string, unknown>) => {
        inserted.push(values);
        return [{ insertId: 1 }];
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          updated.push({ id: (existingRow as any)?.id, values });
        },
      }),
    }),
  };
}

describe("budget.isBudgetExceeded", () => {
  it("is false when no ledger row exists yet for this month", async () => {
    const db = makeMockDb(null);
    expect(await isBudgetExceeded(db, 1)).toBe(false);
  });

  it("is false when spend is under the $20 (2000 cent) cutoff", async () => {
    const db = makeMockDb({ estimatedCostCents: 1999 });
    expect(await isBudgetExceeded(db, 1)).toBe(false);
  });

  it("is true once spend reaches the cutoff", async () => {
    const db = makeMockDb({ estimatedCostCents: 2000 });
    expect(await isBudgetExceeded(db, 1)).toBe(true);
  });

  it("is true when spend has gone past the cutoff", async () => {
    const db = makeMockDb({ estimatedCostCents: 5000 });
    expect(await isBudgetExceeded(db, 1)).toBe(true);
  });
});

describe("budget.recordUsage", () => {
  it("inserts a new row with an estimated cost when none exists this month", async () => {
    const db = makeMockDb(null);
    await recordUsage(db, 1, { inputTokens: 1_000_000, outputTokens: 1_000_000 });

    expect(db.inserted).toHaveLength(1);
    const row = db.inserted[0];
    expect(row.businessId).toBe(1);
    expect(row.inputTokens).toBe(1_000_000);
    expect(row.outputTokens).toBe(1_000_000);
    // Default rates: $0.125/1M in + $1.00/1M out = 112.5 cents, rounded.
    expect(row.estimatedCostCents).toBe(113);
  });

  it("adds to the running total when a row already exists this month", async () => {
    const db = makeMockDb({
      id: 7,
      inputTokens: 500_000,
      outputTokens: 500_000,
      estimatedCostCents: 500,
    });
    await recordUsage(db, 1, { inputTokens: 100_000, outputTokens: 0 });

    expect(db.inserted).toHaveLength(0);
    expect(db.updated).toHaveLength(1);
    const values = db.updated[0].values;
    expect(values.inputTokens).toBe(600_000);
    expect(values.outputTokens).toBe(500_000);
    // 500 existing + (100_000/1_000_000 * 12.5) = 500 + 1.25 = 501.25 -> 501
    expect(values.estimatedCostCents).toBe(501);
  });
});
