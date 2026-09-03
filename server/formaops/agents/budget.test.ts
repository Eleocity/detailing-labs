import { describe, expect, it } from "vitest";
import { isBudgetExceeded, recordUsage } from "./budget";

/**
 * Mock db tracking insert/update calls, with a configurable existing row.
 * `estimatedCostCents` on the row is a string, matching how mysql2/drizzle
 * actually return a DECIMAL column — not a plain JS number.
 */
function makeMockDb(existingRow: Record<string, unknown> | null) {
  const inserted: Record<string, unknown>[] = [];
  const updated: { id: unknown; values: Record<string, unknown> }[] = [];
  let row = existingRow;
  return {
    inserted,
    updated,
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (row ? [row] : []),
        }),
      }),
    }),
    insert: () => ({
      values: async (values: Record<string, unknown>) => {
        inserted.push(values);
        row = { id: 1, ...values }; // so a follow-up recordUsage call in the same test sees it
        return [{ insertId: 1 }];
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          updated.push({ id: (row as any)?.id, values });
          row = { ...row, ...values };
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
    const db = makeMockDb({ estimatedCostCents: "1999.0000" });
    expect(await isBudgetExceeded(db, 1)).toBe(false);
  });

  it("is true once spend reaches the cutoff", async () => {
    const db = makeMockDb({ estimatedCostCents: "2000.0000" });
    expect(await isBudgetExceeded(db, 1)).toBe(true);
  });

  it("is true when spend has gone past the cutoff", async () => {
    const db = makeMockDb({ estimatedCostCents: "5000.0000" });
    expect(await isBudgetExceeded(db, 1)).toBe(true);
  });

  it("is true once many small fractional-cent calls sum past the cutoff", async () => {
    // Regression test: estimatedCostCents used to be an INT rounded on
    // every write, so a long run of sub-cent calls could stay stuck
    // reporting near-zero spend forever, never actually crossing the
    // cutoff no matter how much was really spent. With DECIMAL precision,
    // repeated small amounts must genuinely add up.
    const db = makeMockDb({ estimatedCostCents: "1999.99" });
    expect(await isBudgetExceeded(db, 1)).toBe(false);
    await recordUsage(db, 1, { inputTokens: 1000, outputTokens: 100 }); // a tiny fraction of a cent
    expect(await isBudgetExceeded(db, 1)).toBe(true);
  });
});

describe("budget.recordUsage", () => {
  it("inserts a new row with a precise fractional-cent estimate when none exists this month", async () => {
    const db = makeMockDb(null);
    await recordUsage(db, 1, { inputTokens: 1_000_000, outputTokens: 1_000_000 });

    expect(db.inserted).toHaveLength(1);
    const row = db.inserted[0];
    expect(row.businessId).toBe(1);
    expect(row.inputTokens).toBe(1_000_000);
    expect(row.outputTokens).toBe(1_000_000);
    // Default rates: $0.125/1M in + $1.00/1M out = 112.5 cents exactly.
    expect(row.estimatedCostCents).toBe("112.5000");
  });

  it("adds to the running total with full decimal precision, not rounded", async () => {
    const db = makeMockDb({
      id: 7,
      inputTokens: 500_000,
      outputTokens: 500_000,
      estimatedCostCents: "500.0000",
    });
    await recordUsage(db, 1, { inputTokens: 100_000, outputTokens: 0 });

    expect(db.inserted).toHaveLength(0);
    expect(db.updated).toHaveLength(1);
    const values = db.updated[0].values;
    expect(values.inputTokens).toBe(600_000);
    expect(values.outputTokens).toBe(500_000);
    // 500 existing + (100_000/1_000_000 * 12.5) = 501.25 exactly — not
    // rounded to 501, which is the whole point of this being a DECIMAL.
    expect(values.estimatedCostCents).toBe("501.2500");
  });

  it("accumulates many small sub-cent calls to a real, non-zero total (the bug this fixes)", async () => {
    const db = makeMockDb(null);
    // 800 input tokens @ $0.125/1M = exactly 0.01 cents/call (a value that
    // divides cleanly at DECIMAL(12,4)'s precision, so this test isn't
    // fighting floating-point/rounding noise unrelated to what it's
    // checking) — every single call, added to a starting total of exactly
    // 0, would round to 0 under the old INT-column, round-on-every-write
    // logic, no matter how many calls were made.
    for (let i = 0; i < 20; i++) {
      await recordUsage(db, 1, { inputTokens: 800, outputTokens: 0 });
    }
    const finalRow = db.updated.length > 0
      ? db.updated[db.updated.length - 1].values
      : db.inserted[0];
    expect(finalRow.estimatedCostCents).toBe("0.2000");
  });
});
