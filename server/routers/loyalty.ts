import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, sql, desc } from "drizzle-orm";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { loyaltyPoints, customers } from "../../drizzle/schema";

export const POINTS_PER_DOLLAR = 1;
export const POINTS_PER_DISCOUNT = 100; // 100 pts = $5
export const DISCOUNT_PER_THRESHOLD = 5;

export async function getLoyaltyBalance(
  db: any,
  customerId: number
): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`SUM(points)` })
    .from(loyaltyPoints)
    .where(eq(loyaltyPoints.customerId, customerId));
  return Number(row?.balance ?? 0);
}

export async function awardPoints(
  db: any,
  customerId: number,
  bookingId: number,
  totalAmount: number
): Promise<void> {
  const pts = Math.floor(totalAmount * POINTS_PER_DOLLAR);
  if (pts <= 0) return;
  await db
    .insert(loyaltyPoints)
    .values({
      customerId,
      bookingId,
      points: pts,
      type: "earned",
      description: `Earned from booking`,
    });
}

export const loyaltyRouter = router({
  getBalance: publicProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        email: z.string().email().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      let customerId = input.customerId;
      if (!customerId && input.email) {
        const [customer] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.email, input.email))
          .limit(1);
        if (!customer) return { balance: 0, history: [] };
        customerId = customer.id;
      }
      if (!customerId) return { balance: 0, history: [] };

      const balance = await getLoyaltyBalance(db, customerId);
      const history = await db
        .select()
        .from(loyaltyPoints)
        .where(eq(loyaltyPoints.customerId, customerId))
        .orderBy(desc(loyaltyPoints.createdAt))
        .limit(50);

      return { balance, history };
    }),

  adminAdjust: adminProcedure
    .input(
      z.object({
        customerId: z.number(),
        points: z.number(),
        description: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db.insert(loyaltyPoints).values({ ...input, type: "adjusted" });
      return { success: true };
    }),

  adminListByCustomer: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const balance = await getLoyaltyBalance(db, input.customerId);
      const history = await db
        .select()
        .from(loyaltyPoints)
        .where(eq(loyaltyPoints.customerId, input.customerId))
        .orderBy(desc(loyaltyPoints.createdAt));
      return { balance, history };
    }),
});
