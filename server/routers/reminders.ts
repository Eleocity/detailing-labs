import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, lte } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { appointmentReminders, bookings } from "../../drizzle/schema";
import { sendEmail } from "../email";
import { sendSMS } from "../sms";

export async function scheduleRemindersForBooking(
  db: any,
  bookingId: number,
  appointmentDate: Date,
  smsConsent: boolean
): Promise<void> {
  const existing = await db
    .select({ id: appointmentReminders.id })
    .from(appointmentReminders)
    .where(eq(appointmentReminders.bookingId, bookingId))
    .limit(1);
  if (existing.length > 0) return;

  const minus24h = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
  const minus2h = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
  const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID;

  const rows: any[] = [
    { bookingId, type: "24h", channel: "email", scheduledFor: minus24h },
    { bookingId, type: "2h", channel: "email", scheduledFor: minus2h },
  ];
  // SMS reminders only ever get queued when the customer explicitly opted
  // in on the booking form — a phone number existing is not consent.
  if (hasTwilio && smsConsent) {
    rows.push({
      bookingId,
      type: "24h",
      channel: "sms",
      scheduledFor: minus24h,
    });
    rows.push({ bookingId, type: "2h", channel: "sms", scheduledFor: minus2h });
  }

  if (rows.some(r => r.scheduledFor > new Date())) {
    await db
      .insert(appointmentReminders)
      .values(rows.filter(r => r.scheduledFor > new Date()));
  }
}

export const remindersRouter = router({
  scheduleForBooking: adminProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      await scheduleRemindersForBooking(
        db,
        booking.id,
        new Date(booking.appointmentDate),
        !!booking.smsConsent
      );
      return { success: true };
    }),

  processQueue: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const pending = await db
      .select()
      .from(appointmentReminders)
      .where(
        and(
          eq(appointmentReminders.status, "pending"),
          lte(appointmentReminders.scheduledFor, new Date())
        )
      )
      .limit(50);

    let sent = 0;
    for (const reminder of pending) {
      try {
        const [booking] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, reminder.bookingId))
          .limit(1);
        if (!booking) {
          await db
            .update(appointmentReminders)
            .set({ status: "failed" } as any)
            .where(eq(appointmentReminders.id, reminder.id));
          continue;
        }

        const name = booking.customerFirstName;
        const timeLabel = reminder.type === "24h" ? "tomorrow" : "in 2 hours";
        const apptTime = new Date(booking.appointmentDate).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit" }
        );
        const address = [
          booking.serviceAddress,
          booking.serviceCity,
          booking.serviceState,
        ]
          .filter(Boolean)
          .join(", ");

        // Defense in depth: re-check consent on the booking itself at send
        // time too, not just at scheduling time, so an sms reminder queued
        // before this consent model existed (smsConsent defaults to false
        // on old rows) never goes out. Not a "failure" — mark it disabled
        // rather than retry-forever or show as an error.
        if (reminder.channel === "sms" && !booking.smsConsent) {
          await db
            .update(appointmentReminders)
            .set({ status: "disabled" } as any)
            .where(eq(appointmentReminders.id, reminder.id));
          continue;
        }

        let ok = false;
        if (reminder.channel === "email" && booking.customerEmail) {
          ok = await sendEmail({
            to: booking.customerEmail,
            subject: `Reminder: Your Forma Auto Spa appointment is ${timeLabel}`,
            html: `<p>Hi ${name},</p><p>This is a friendly reminder that your Forma Auto Spa appointment is <strong>${timeLabel} at ${apptTime}</strong>.</p><p><strong>Location:</strong> ${address}</p><p>If you need to reschedule, please contact us as soon as possible.</p><p>— The Forma Auto Spa Team</p>`,
          });
        } else if (reminder.channel === "sms" && booking.customerPhone) {
          ok = await sendSMS(
            booking.customerPhone,
            `Hi ${name}! Reminder: your Forma Auto Spa appointment is ${timeLabel} at ${apptTime} at ${address}. Reply STOP to opt out.`
          );
        }

        await db
          .update(appointmentReminders)
          .set({
            status: ok ? "sent" : "failed",
            sentAt: ok ? new Date() : null,
          } as any)
          .where(eq(appointmentReminders.id, reminder.id));
        if (ok) sent++;
      } catch {
        await db
          .update(appointmentReminders)
          .set({ status: "failed" } as any)
          .where(eq(appointmentReminders.id, reminder.id));
      }
    }

    return { processed: pending.length, sent };
  }),

  listByBooking: adminProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      return db
        .select()
        .from(appointmentReminders)
        .where(eq(appointmentReminders.bookingId, input.bookingId));
    }),

  toggleForBooking: adminProcedure
    .input(z.object({ bookingId: z.number(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      await db
        .update(appointmentReminders)
        .set({ status: input.enabled ? "pending" : "disabled" } as any)
        .where(
          and(
            eq(appointmentReminders.bookingId, input.bookingId),
            eq(
              appointmentReminders.status,
              input.enabled ? "disabled" : "pending"
            )
          )
        );
      return { success: true };
    }),
});
