import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, lte, sql } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { followUpQueue, bookings, customers } from "../../drizzle/schema";
import { sendEmail } from "../email";
import { BRAND } from "../../shared/brand";

export async function scheduleFollowUpsForBooking(
  db: any,
  bookingId: number,
  customerId: number | null
): Promise<void> {
  const existing = await db
    .select({ id: followUpQueue.id })
    .from(followUpQueue)
    .where(eq(followUpQueue.bookingId, bookingId))
    .limit(1);
  if (existing.length > 0) return;

  const now = new Date();
  const day1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(followUpQueue).values([
    { bookingId, customerId, type: "review_request", scheduledFor: day1 },
    { bookingId, customerId, type: "follow_up", scheduledFor: day7 },
    { bookingId, customerId, type: "rebook_offer", scheduledFor: day30 },
  ]);
}

export const followUpRouter = router({
  processQueue: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const pending = await db
      .select()
      .from(followUpQueue)
      .where(
        and(
          eq(followUpQueue.status, "pending"),
          lte(followUpQueue.scheduledFor, new Date())
        )
      )
      .limit(50);

    let sent = 0;
    for (const item of pending) {
      try {
        const [booking] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, item.bookingId))
          .limit(1);
        if (!booking?.customerEmail) {
          await db
            .update(followUpQueue)
            .set({ status: "skipped" } as any)
            .where(eq(followUpQueue.id, item.id));
          continue;
        }

        const name = booking.customerFirstName;
        let subject = "";
        let html = "";

        const bookingUrl = `https://${BRAND.domain.live}${BRAND.booking.primaryPath}`;
        if (item.type === "review_request") {
          subject = `How did we do, ${name}?`;
          html = `<p>Hi ${name},</p><p>Thank you for choosing ${BRAND.displayName}! We'd love to hear about your experience — just reply to this email and let us know how it went.</p><p>It means the world to our small team. Thanks again!</p><p>— The ${BRAND.displayName} Team</p>`;
        } else if (item.type === "follow_up") {
          subject = `Checking in, ${name}`;
          html = `<p>Hi ${name},</p><p>Just checking in! It's been a week since your ${BRAND.displayName} appointment — we hope your vehicle is still looking great!</p><p>If you have any questions or feedback, just reply to this email. We're always here to help.</p><p>— The ${BRAND.displayName} Team</p>`;
        } else {
          subject = `Time for another detail? Special offer inside`;
          html = `<p>Hi ${name},</p><p>It's been about a month since your last ${BRAND.displayName} appointment! Your vehicle is probably due for another round of TLC.</p><p><a href="${bookingUrl}" style="background:#7c3aed;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:12px 0">Book Now →</a></p><p>As a returning customer, you'll automatically earn loyalty points on your next booking.</p><p>— The ${BRAND.displayName} Team</p>`;
        }

        await sendEmail({ to: booking.customerEmail, subject, html });
        await db
          .update(followUpQueue)
          .set({ status: "sent", sentAt: new Date() } as any)
          .where(eq(followUpQueue.id, item.id));
        sent++;
      } catch {
        // Skip failed items, they'll retry next run
      }
    }

    return { processed: pending.length, sent };
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
        .from(followUpQueue)
        .where(eq(followUpQueue.customerId, input.customerId));
    }),

  skip: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db
        .update(followUpQueue)
        .set({ status: "skipped" } as any)
        .where(eq(followUpQueue.id, input.id));
      return { success: true };
    }),
});
