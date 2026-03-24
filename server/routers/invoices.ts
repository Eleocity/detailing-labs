import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { sendEmail, invoiceEmailV2, receiptEmail } from "../email";
import { getDb } from "../db";
import { invoices, bookings, siteContent } from "../../drizzle/schema";

function adminOnly(role: string) {
  if (role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin only" });
}

export const invoicesRouter = router({

  // ── List all invoices ────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().default(50), offset: z.number().int().default(0) }))
    .query(async ({ ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          bookingId: invoices.bookingId,
          customerId: invoices.customerId,
          lineItems: invoices.lineItems,
          subtotal: invoices.subtotal,
          travelFee: invoices.travelFee,
          taxRate: invoices.taxRate,
          taxAmount: invoices.taxAmount,
          totalAmount: invoices.totalAmount,
          status: invoices.status,
          notes: invoices.notes,
          dueDate: invoices.dueDate,
          paidAt: invoices.paidAt,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
          customerFirstName: bookings.customerFirstName,
          customerLastName:  bookings.customerLastName,
          customerEmail:     bookings.customerEmail,
          customerPhone:     bookings.customerPhone,
          packageName:       bookings.packageName,
          serviceName:       bookings.serviceName,
          serviceAddress:    bookings.serviceAddress,
          serviceCity:       bookings.serviceCity,
          serviceState:      bookings.serviceState,
          appointmentDate:   bookings.appointmentDate,
        })
        .from(invoices)
        .leftJoin(bookings, eq(invoices.bookingId, bookings.id))
        .orderBy(desc(invoices.createdAt))
        .limit(50);
    }),

  // ── Get single invoice ───────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      let booking = null;
      if (invoice.bookingId) {
        const [b] = await db.select().from(bookings).where(eq(bookings.id, invoice.bookingId)).limit(1);
        booking = b ?? null;
      }
      return { invoice, booking };
    }),

  // ── Update status ────────────────────────────────────────────────────────
  updateStatus: protectedProcedure
    .input(z.object({
      id:     z.number().int(),
      status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === "paid") updateData.paidAt = new Date();
      await db.update(invoices).set(updateData as any).where(eq(invoices.id, input.id));
      return { success: true };
    }),

  // ── Update invoice details (travel fee, tax, notes, due date) ────────────
  update: protectedProcedure
    .input(z.object({
      id:         z.number().int(),
      notes:      z.string().optional(),
      dueDate:    z.string().optional(),
      travelFee:  z.number().min(0).optional(),
      taxRate:    z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      const subtotal    = Number(inv.subtotal);
      const travelFee   = input.travelFee  ?? Number(inv.travelFee  ?? 0);
      const taxRate     = input.taxRate    ?? Number(inv.taxRate    ?? 0);
      const taxAmount   = (subtotal + travelFee) * taxRate;
      const totalAmount = subtotal + travelFee + taxAmount;
      await db.update(invoices).set({
        notes:       input.notes   ?? inv.notes,
        dueDate:     input.dueDate ? new Date(input.dueDate) : inv.dueDate,
        travelFee:   travelFee.toFixed(2)   as any,
        taxRate:     taxRate.toFixed(4)     as any,
        taxAmount:   taxAmount.toFixed(2)   as any,
        totalAmount: totalAmount.toFixed(2) as any,
      }).where(eq(invoices.id, input.id));
      return { success: true };
    }),

  // ── Send invoice email to customer ──────────────────────────────────────
  send: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });

      let booking = null;
      if (inv.bookingId) {
        const [b] = await db.select().from(bookings).where(eq(bookings.id, inv.bookingId)).limit(1);
        booking = b ?? null;
      }

      const customerEmail = booking?.customerEmail;
      if (!customerEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "No customer email on file for this booking" });

      // Get business contact info
      const contactRows = await db.select().from(siteContent).where(eq(siteContent.section, "contact")).limit(20);
      const phone = contactRows.find(r => r.key === "phone")?.value || "(262) 555-0190";
      const bizEmail = contactRows.find(r => r.key === "email")?.value || "hello@detailinglabswi.com";

      const lineItems: { name: string; qty: number; price: number }[] = inv.lineItems ? JSON.parse(inv.lineItems) : [];

      // Check for existing Square payment link in notes
      const paymentUrlMatch = inv.notes?.match(/Square payment link: (https:\/\/[^\s\n]+)/);
      const paymentUrl = paymentUrlMatch?.[1] ?? null;

      const content = invoiceEmailV2({
        invoiceNumber:   inv.invoiceNumber,
        customerFirstName: booking?.customerFirstName ?? "there",
        packageName:     booking?.packageName ?? "Mobile Detailing",
        appointmentDate: booking?.appointmentDate ? new Date(booking.appointmentDate) : new Date(inv.createdAt),
        serviceAddress:  [booking?.serviceAddress, booking?.serviceCity, booking?.serviceState].filter(Boolean).join(", ") || "Your location",
        lineItems,
        subtotal:    Number(inv.subtotal),
        travelFee:   Number(inv.travelFee ?? 0),
        taxAmount:   Number(inv.taxAmount ?? 0),
        totalAmount: Number(inv.totalAmount),
        notes:       inv.notes?.replace(/Square payment link:.*$/m, "").trim() ?? null,
        phone,
        businessEmail: bizEmail,
        paymentUrl,
      });

      const sent = await sendEmail({ to: customerEmail, ...content });
      if (!sent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send email — check SENDGRID_API_KEY" });

      // Mark as sent
      await db.update(invoices).set({ status: "sent" }).where(eq(invoices.id, input.id));

      return { success: true, sentTo: customerEmail };
    }),

  // ── Mark paid + send receipt ─────────────────────────────────────────────
  markPaidAndReceipt: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });

      await db.update(invoices).set({ status: "paid", paidAt: new Date() } as any).where(eq(invoices.id, inv.id));

      // Send receipt to customer
      if (inv.bookingId) {
        const [booking] = await db.select().from(bookings).where(eq(bookings.id, inv.bookingId)).limit(1);
        const contactRows = await db.select().from(siteContent).where(eq(siteContent.section, "contact")).limit(20);
        const phone    = contactRows.find(r => r.key === "phone")?.value    || "(262) 555-0190";
        const bizEmail = contactRows.find(r => r.key === "email")?.value    || "hello@detailinglabswi.com";
        const lineItems: { name: string; qty: number; price: number }[] = inv.lineItems ? JSON.parse(inv.lineItems) : [];

        if (booking?.customerEmail) {
          const receipt = receiptEmail({
            invoiceNumber:     inv.invoiceNumber,
            customerFirstName: booking.customerFirstName,
            packageName:       booking.packageName ?? "Mobile Detailing",
            serviceAddress:    [booking.serviceAddress, booking.serviceCity, booking.serviceState].filter(Boolean).join(", "),
            lineItems,
            totalAmount:       Number(inv.totalAmount),
            paidAt:            new Date(),
            phone,
            businessEmail:     bizEmail,
          });
          sendEmail({ to: booking.customerEmail, ...receipt }).catch(console.error);
        }
      }
      return { success: true };
    }),

  // ── Delete invoice ───────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(invoices).where(eq(invoices.id, input.id));
      return { success: true };
    }),
});
