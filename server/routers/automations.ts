import { z } from "zod";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { getDb } from "../db";
import { emailAutomationLog, emailAutomationSettings } from "../../drizzle/schema";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

function adminOnly(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}

const AUTOMATION_LABELS: Record<string, string> = {
  appointment_reminder_24h: "24h Appointment Reminder",
  appointment_reminder_2h:  "2h Appointment Reminder",
  review_request:           "Review Request",
  win_back_90d:             "Win-Back (90 days)",
  coating_anniversary:      "Coating Anniversary (1yr)",
};

const ALL_TYPES = Object.keys(AUTOMATION_LABELS);

export const automationsRouter = router({

  // ── Get all settings + stats ───────────────────────────────────────────────
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    adminOnly(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Ensure all defaults exist
    for (const type of ALL_TYPES) {
      await db.insert(emailAutomationSettings)
        .values({ type, enabled: true })
        .onDuplicateKeyUpdate({ set: { type } }); // no-op update to avoid duplicate error
    }

    const settings = await db.select().from(emailAutomationSettings);

    // Get sent counts per type (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const counts = await db
      .select({
        type:  emailAutomationLog.automationType,
        count: sql<number>`count(*)`,
      })
      .from(emailAutomationLog)
      .where(gte(emailAutomationLog.sentAt, since))
      .groupBy(emailAutomationLog.automationType);

    const countMap: Record<string, number> = {};
    for (const c of counts) countMap[c.type] = Number(c.count);

    return settings.map(s => ({
      type:    s.type,
      label:   AUTOMATION_LABELS[s.type] ?? s.type,
      enabled: s.enabled,
      sent30d: countMap[s.type] ?? 0,
    }));
  }),

  // ── Toggle an automation on/off ────────────────────────────────────────────
  toggle: protectedProcedure
    .input(z.object({ type: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(emailAutomationSettings)
        .set({ enabled: input.enabled })
        .where(eq(emailAutomationSettings.type, input.type));
      return { success: true };
    }),

  // ── Get recent logs ────────────────────────────────────────────────────────
  getLogs: protectedProcedure
    .input(z.object({
      limit:  z.number().min(1).max(200).default(50),
      type:   z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const where = input.type
        ? eq(emailAutomationLog.automationType, input.type)
        : undefined;

      const logs = await db
        .select()
        .from(emailAutomationLog)
        .where(where)
        .orderBy(desc(emailAutomationLog.sentAt))
        .limit(input.limit);

      return logs.map(l => ({
        id:            l.id,
        type:          l.automationType,
        label:         AUTOMATION_LABELS[l.automationType] ?? l.automationType,
        email:         l.email,
        bookingId:     l.bookingId,
        customerId:    l.customerId,
        status:        l.status,
        sentAt:        l.sentAt,
        error:         l.error,
      }));
    }),

  // ── Manual trigger (for testing) ───────────────────────────────────────────
  triggerNow: protectedProcedure.mutation(async ({ ctx }) => {
    adminOnly(ctx.user.role);
    const { runAutomations } = await import("../automations");
    runAutomations().catch(() => {});
    return { success: true, message: "Automation run triggered — check logs in ~30 seconds" };
  }),

  // ── Stats summary ──────────────────────────────────────────────────────────
  getStats: protectedProcedure.query(async ({ ctx }) => {
    adminOnly(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [total7d, total30d, totalAll] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(emailAutomationLog)
        .where(gte(emailAutomationLog.sentAt, new Date(Date.now() - 7  * 24 * 60 * 60 * 1000))),
      db.select({ count: sql<number>`count(*)` }).from(emailAutomationLog)
        .where(gte(emailAutomationLog.sentAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
      db.select({ count: sql<number>`count(*)` }).from(emailAutomationLog),
    ]);

    return {
      sent7d:  Number(total7d[0]?.count  ?? 0),
      sent30d: Number(total30d[0]?.count ?? 0),
      sentAll: Number(totalAll[0]?.count ?? 0),
    };
  }),
});

// ─── Custom Automation CRUD Router ───────────────────────────────────────────

export const customAutomationsRouter = router({

  list: protectedProcedure.query(async ({ ctx }) => {
    adminOnly(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { emailCustomAutomations: tbl, emailAutomationLog: logTbl } = await import("../../drizzle/schema");
    const rows = await db.select().from(tbl).orderBy(desc(tbl.createdAt));
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const counts = await db
      .select({ id: logTbl.customAutomationId, count: sql<number>`count(*)` })
      .from(logTbl)
      .where(and(gte(logTbl.sentAt, since), sql`${logTbl.customAutomationId} IS NOT NULL`))
      .groupBy(logTbl.customAutomationId);
    const countMap: Record<number, number> = {};
    for (const c of counts) if (c.id) countMap[c.id] = Number(c.count);
    return rows.map(r => ({ ...r, sent30d: countMap[r.id] ?? 0 }));
  }),

  create: protectedProcedure
    .input(z.object({
      name:         z.string().min(1).max(200),
      triggerType:  z.string(),
      triggerValue: z.number().int().min(0),
      triggerUnit:  z.enum(["hours", "days"]),
      subject:      z.string().min(1).max(500),
      body:         z.string().min(1),
      enabled:      z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { emailCustomAutomations: tbl } = await import("../../drizzle/schema");
      await db.insert(tbl).values(input as any);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id:           z.number().int(),
      name:         z.string().min(1).max(200).optional(),
      triggerType:  z.string().optional(),
      triggerValue: z.number().int().min(0).optional(),
      triggerUnit:  z.enum(["hours", "days"]).optional(),
      subject:      z.string().min(1).max(500).optional(),
      body:         z.string().min(1).optional(),
      enabled:      z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { emailCustomAutomations: tbl } = await import("../../drizzle/schema");
      const { id, ...data } = input;
      await db.update(tbl).set(data as any).where(eq(tbl.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { emailCustomAutomations: tbl } = await import("../../drizzle/schema");
      await db.delete(tbl).where(eq(tbl.id, input.id));
      return { success: true };
    }),
});
