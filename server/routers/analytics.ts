import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { bookings, customers, invoices } from "../../drizzle/schema";

export const analyticsRouter = router({
  kpis: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    );

    const [allCompleted, thisMonth, lastMonth, allCustomers, repeatCustomers] =
      await Promise.all([
        db
          .select({
            total: sql<string>`SUM(totalAmount)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(bookings)
          .where(eq(bookings.status, "completed")),
        db
          .select({
            total: sql<string>`SUM(totalAmount)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(bookings)
          .where(
            and(
              eq(bookings.status, "completed"),
              gte(bookings.appointmentDate, startOfMonth)
            )
          ),
        db
          .select({
            total: sql<string>`SUM(totalAmount)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(bookings)
          .where(
            and(
              eq(bookings.status, "completed"),
              gte(bookings.appointmentDate, startOfLastMonth),
              lte(bookings.appointmentDate, endOfLastMonth)
            )
          ),
        db.select({ count: sql<number>`COUNT(*)` }).from(customers),
        db
          .select({
            customerId: bookings.customerId,
            count: sql<number>`COUNT(*)`,
          })
          .from(bookings)
          .where(
            and(eq(bookings.status, "completed"), sql`customerId IS NOT NULL`)
          )
          .groupBy(bookings.customerId)
          .having(sql`COUNT(*) > 1`),
      ]);

    const totalRevenue = Number(allCompleted[0]?.total ?? 0);
    const totalCompleted = Number(allCompleted[0]?.count ?? 0);
    const revenueThisMonth = Number(thisMonth[0]?.total ?? 0);
    const completedThisMonth = Number(thisMonth[0]?.count ?? 0);
    const revenueLastMonth = Number(lastMonth[0]?.total ?? 0);
    const totalCustomers = Number(allCustomers[0]?.count ?? 0);
    const retentionRate =
      totalCustomers > 0
        ? Math.round((repeatCustomers.length / totalCustomers) * 100)
        : 0;
    const avgJobValue = totalCompleted > 0 ? totalRevenue / totalCompleted : 0;

    return {
      totalRevenue,
      totalCompleted,
      revenueThisMonth,
      completedThisMonth,
      revenueLastMonth,
      totalCustomers,
      retentionRate,
      avgJobValue,
    };
  }),

  revenueOverTime: adminProcedure
    .input(
      z.object({
        period: z.enum(["daily", "weekly", "monthly"]),
        from: z.string(),
        to: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const format =
        input.period === "daily"
          ? "%Y-%m-%d"
          : input.period === "weekly"
            ? "%Y-%u"
            : "%Y-%m";
      const rows = await db.execute(
        sql`SELECT DATE_FORMAT(appointmentDate, ${format}) as bucket, SUM(totalAmount) as revenue, COUNT(*) as count FROM bookings WHERE status = 'completed' AND appointmentDate BETWEEN ${new Date(input.from)} AND ${new Date(input.to)} GROUP BY bucket ORDER BY bucket ASC`
      );
      return (rows[0] as any[]).map((r: any) => ({
        bucket: r.bucket,
        revenue: Number(r.revenue ?? 0),
        count: Number(r.count ?? 0),
      }));
    }),

  topServices: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const rows = await db.execute(
      sql`SELECT packageName as name, COUNT(*) as count, SUM(totalAmount) as revenue FROM bookings WHERE status = 'completed' AND packageName IS NOT NULL GROUP BY packageName ORDER BY count DESC LIMIT 10`
    );
    return (rows[0] as any[]).map((r: any) => ({
      name: r.name,
      count: Number(r.count),
      revenue: Number(r.revenue ?? 0),
    }));
  }),

  busiestDays: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const rows = await db.execute(
      sql`SELECT DAYOFWEEK(appointmentDate) as dayIndex, COUNT(*) as count FROM bookings WHERE status = 'completed' GROUP BY dayIndex ORDER BY dayIndex`
    );
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (rows[0] as any[]).map((r: any) => ({
      day: dayNames[(Number(r.dayIndex) - 1) % 7],
      count: Number(r.count),
    }));
  }),

  customerAcquisition: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const rows = await db.execute(
      sql`SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as newCustomers FROM customers GROUP BY month ORDER BY month DESC LIMIT 12`
    );
    return (rows[0] as any[])
      .reverse()
      .map((r: any) => ({
        month: r.month,
        newCustomers: Number(r.newCustomers),
      }));
  }),
});
