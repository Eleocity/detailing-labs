import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { referrals, customers, loyaltyPoints } from "../../drizzle/schema";
import { customAlphabet } from "nanoid";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function applyReferralOnBooking(
  db: any,
  bookingId: number,
  referralCode: string,
  referredCustomerId: number
): Promise<void> {
  const [referrer] = await db
    .select({ id: customers.id, firstName: customers.firstName })
    .from(customers)
    .where(eq(customers.referralCode, referralCode))
    .limit(1);
  if (!referrer || referrer.id === referredCustomerId) return;

  const existing = await db
    .select()
    .from(referrals)
    .where(eq(referrals.bookingId, bookingId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(referrals).values({
    referrerId: referrer.id,
    referredCustomerId,
    bookingId,
    status: "qualified",
    rewardAmount: "5.00",
  });

  await db
    .insert(loyaltyPoints)
    .values({
      customerId: referrer.id,
      bookingId,
      points: 500,
      type: "earned",
      description: "Referral bonus",
    });
  await db
    .insert(loyaltyPoints)
    .values({
      customerId: referredCustomerId,
      bookingId,
      points: 250,
      type: "earned",
      description: "Referred friend bonus",
    });
}

export const referralsRouter = router({
  generateCode: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const code = generateCode();
      await db
        .update(customers)
        .set({ referralCode: code } as any)
        .where(eq(customers.id, input.customerId));
      return { code };
    }),

  validateCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [customer] = await db
        .select({ id: customers.id, firstName: customers.firstName })
        .from(customers)
        .where(eq(customers.referralCode, input.code.toUpperCase()))
        .limit(1);
      if (!customer) return { valid: false, referrerName: "" };
      return { valid: true, referrerName: customer.firstName };
    }),

  listByCustomer: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      return db
        .select()
        .from(referrals)
        .where(eq(referrals.referrerId, input.customerId))
        .orderBy(desc(referrals.createdAt));
    }),

  getMyReferralCode: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [customer] = await db
        .select({ id: customers.id, referralCode: customers.referralCode })
        .from(customers)
        .where(eq(customers.email, input.email))
        .limit(1);
      if (!customer) return { code: null };
      return { code: customer.referralCode };
    }),
});
