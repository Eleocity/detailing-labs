import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { giftCards, giftCardTransactions } from "../../drizzle/schema";
import { customAlphabet } from "nanoid";
import { sendEmail } from "../email";

const generateGiftCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 12);

export async function redeemGiftCard(
  db: any,
  code: string,
  amount: number,
  bookingId?: number
): Promise<{ success: boolean; deducted: number }> {
  const [card] = await db
    .select()
    .from(giftCards)
    .where(eq(giftCards.code, code.toUpperCase()))
    .limit(1);
  if (!card || card.status !== "active") return { success: false, deducted: 0 };
  if (card.expiresAt && new Date(card.expiresAt) < new Date())
    return { success: false, deducted: 0 };

  const deducted = Math.min(amount, Number(card.currentBalance));
  const newBalance = Number(card.currentBalance) - deducted;

  await db
    .update(giftCards)
    .set({
      currentBalance: newBalance.toFixed(2),
      status: newBalance <= 0 ? "redeemed" : "active",
    } as any)
    .where(eq(giftCards.id, card.id));

  await db.insert(giftCardTransactions).values({
    giftCardId: card.id,
    bookingId: bookingId ?? null,
    amount: deducted.toFixed(2),
    type: "redeem",
  });

  return { success: true, deducted };
}

export const giftCardsRouter = router({
  issue: adminProcedure
    .input(
      z.object({
        purchaserName: z.string().optional(),
        purchaserEmail: z.string().email().optional(),
        recipientName: z.string().optional(),
        recipientEmail: z.string().email().optional(),
        initialBalance: z.number().positive(),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const code = generateGiftCode();
      const [result] = await db
        .insert(giftCards)
        .values({
          code,
          purchaserName: input.purchaserName ?? null,
          purchaserEmail: input.purchaserEmail ?? null,
          recipientName: input.recipientName ?? null,
          recipientEmail: input.recipientEmail ?? null,
          initialBalance: input.initialBalance.toFixed(2),
          currentBalance: input.initialBalance.toFixed(2),
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        } as any)
        .$returningId();

      await db
        .insert(giftCardTransactions)
        .values({
          giftCardId: result.id,
          amount: input.initialBalance.toFixed(2),
          type: "issue",
          note: "Gift card issued",
        });

      if (input.recipientEmail) {
        await sendEmail({
          to: input.recipientEmail,
          subject: "You received a Forma Auto Spa Gift Card!",
          html: `<p>Hi ${input.recipientName ?? "there"},</p><p>You've received a <strong>$${input.initialBalance.toFixed(2)}</strong> Forma Auto Spa gift card!</p><p><strong>Your Code: ${code}</strong></p><p>Use it at checkout when booking your next mobile detail.</p><p>— The Forma Auto Spa Team</p>`,
        });
      }

      return { id: result.id, code };
    }),

  validate: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [card] = await db
        .select()
        .from(giftCards)
        .where(eq(giftCards.code, input.code.toUpperCase()))
        .limit(1);
      if (!card || card.status !== "active")
        return {
          valid: false,
          currentBalance: 0,
          recipientName: null,
          expiresAt: null,
        };
      if (card.expiresAt && new Date(card.expiresAt) < new Date())
        return {
          valid: false,
          currentBalance: 0,
          recipientName: null,
          expiresAt: null,
        };
      return {
        valid: true,
        currentBalance: Number(card.currentBalance),
        recipientName: card.recipientName,
        expiresAt: card.expiresAt,
      };
    }),

  adminList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    return db.select().from(giftCards).orderBy(desc(giftCards.createdAt));
  }),

  adminVoid: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db
        .update(giftCards)
        .set({ status: "cancelled" } as any)
        .where(eq(giftCards.id, input.id));
      return { success: true };
    }),

  adminTransactions: adminProcedure
    .input(z.object({ giftCardId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      return db
        .select()
        .from(giftCardTransactions)
        .where(eq(giftCardTransactions.giftCardId, input.giftCardId))
        .orderBy(desc(giftCardTransactions.createdAt));
    }),
});
